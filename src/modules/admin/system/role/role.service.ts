import { Inject, Injectable } from '@nestjs/common';
import { difference, filter, includes, isEmpty, map } from 'lodash';
import { ROOT_ROLE_ID } from 'src/modules/admin/admin.constants';
import { AdminWSService } from 'src/modules/ws/admin-ws.service';
import { CreateRoleDto, UpdateRoleDto } from './role.dto';
import { CreatedRoleId, RoleInfo } from './role.class';
import { sys_role } from '@prisma/client';
import { prisma } from 'src/prisma';

@Injectable()
export class SysRoleService {
  constructor(
    @Inject(ROOT_ROLE_ID) private rootRoleId: number,
    private adminWSService: AdminWSService,
  ) {}

  /**
   * 列举所有角色：除去超级管理员
   */
  async list(): Promise<sys_role[]> {
    const result = await prisma.sys_role.findMany({
      where: {
        id: {
          not: this.rootRoleId,
        },
      },
    });
    return result;
  }

  /**
   * 列举所有角色条数：除去超级管理员
   */
  async count(): Promise<number> {
    const count = await prisma.sys_role.count({
      where: {
        id: {
          not: this.rootRoleId,
        },
      },
    });
    return count;
  }

  /**
   * 根据角色获取角色信息
   */
  async info(rid: number): Promise<RoleInfo> {
    const roleInfo = await prisma.sys_role.findUnique({
      where: {
        id: rid,
      },
    });
    const menus = await prisma.sys_role_menu.findMany({
      where: {
        roleId: rid,
      },
    });
    const depts = await prisma.sys_role_department.findMany({
      where: {
        roleId: rid,
      },
    });
    return { roleInfo, menus, depts };
  }

  /**
   * 根据角色Id数组删除
   */
  async delete(roleIds: number[]): Promise<void> {
    if (includes(roleIds, this.rootRoleId)) {
      throw new Error('Not Support Delete Root');
    }
    await prisma.$transaction(async (prisma) => {
      await prisma.sys_role.deleteMany({
        where: {
          id: {
            in: roleIds,
          },
        },
      });
      await prisma.sys_role_menu.deleteMany({
        where: {
          roleId: {
            in: roleIds,
          },
        },
      });
      await prisma.sys_role_department.deleteMany({
        where: {
          roleId: {
            in: roleIds,
          },
        },
      });
    });
  }

  /**
   * 增加角色
   */
  async add(param: CreateRoleDto, uid: number): Promise<CreatedRoleId> {
    const { name, label, remark, menus, depts } = param;
    // const role = await this.roleRepository.insert({
    //   name,
    //   label,
    //   remark,
    //   userId: `${uid}`,
    // });
    const role = await prisma.sys_role.create({
      data: {
        name,
        label,
        remark,
        userId: `${uid}`,
      },
    });
    const { id } = role;
    const roleId = id;
    if (menus && menus.length > 0) {
      // 关联菜单
      const insertRows = menus.map((m) => {
        return {
          roleId: roleId,
          menuId: m,
        };
      });
      await prisma.sys_role_menu.createMany({
        data: insertRows,
      });
    }
    if (depts && depts.length > 0) {
      // 关联部门
      const insertRows = depts.map((d) => {
        return {
          roleId: roleId,
          departmentId: d,
        };
      });
      await prisma.sys_role_department.createMany({
        data: insertRows,
      });
    }
    return { roleId };
  }

  /**
   * 更新角色信息
   */
  async update(param: UpdateRoleDto): Promise<sys_role> {
    const { roleId, name, label, remark, menus, depts } = param;
    const role = await prisma.sys_role.update({
      data: {
        name,
        label,
        remark,
      },
      where: {
        id: roleId,
      },
    });
    const originDeptRows = await prisma.sys_role_department.findMany({
      where: {
        roleId: roleId,
      },
    });
    const originMenuRows = await prisma.sys_role_menu.findMany({
      where: {
        roleId: roleId,
      },
    });
    const originMenuIds = originMenuRows.map((e) => {
      return e.menuId;
    });
    const originDeptIds = originDeptRows.map((e) => {
      return e.departmentId;
    });
    // 开始对比差异
    const insertMenusRowIds = difference(menus, originMenuIds);
    const deleteMenusRowIds = difference(originMenuIds, menus);
    const insertDeptRowIds = difference(depts, originDeptIds);
    const deleteDeptRowIds = difference(originDeptIds, depts);
    // using transaction
    await prisma.$transaction(async (prisma) => {
      // 菜单
      if (insertMenusRowIds.length > 0) {
        // 有条目更新
        const insertRows = insertMenusRowIds.map((e) => {
          return {
            role_id: roleId,
            menu_id: e,
          };
        });
        await prisma.sys_role_menu.createMany({
          data: insertRows,
        });
      }
      if (deleteMenusRowIds.length > 0) {
        // 有条目需要删除
        const realDeleteRowIds = filter(originMenuRows, (e) => {
          return includes(deleteMenusRowIds, e.menu_id);
        }).map((e) => {
          return e.id;
        });
        await prisma.sys_role_menu.deleteMany({
          where: {
            id: {
              in: realDeleteRowIds,
            },
          },
        });
      }
      // 部门
      if (insertDeptRowIds.length > 0) {
        // 有条目更新
        const insertRows = insertDeptRowIds.map((e) => {
          return {
            role_id: roleId,
            department_id: e,
          };
        });
        await prisma.sys_role_department.createMany({
          data: insertRows,
        });
      }
      if (deleteDeptRowIds.length > 0) {
        // 有条目需要删除
        const realDeleteRowIds = filter(originDeptRows, (e) => {
          return includes(deleteDeptRowIds, e.department_id);
        }).map((e) => {
          return e.id;
        });
        await prisma.sys_role_department.deleteMany({
          where: {
            id: {
              in: realDeleteRowIds,
            },
          },
        });
      }
    });
    // 如果勾选了新的菜单或取消勾选了原有的菜单，则通知前端重新获取权限菜单
    if ([insertMenusRowIds, deleteMenusRowIds].some((n) => n.length)) {
      this.adminWSService.noticeUserToUpdateMenusByRoleIds([roleId]);
    }

    return role;
  }

  /**
   * 分页加载角色信息
   */
  async page(param: any): Promise<sys_role[]> {
    const { limit, page, name, label, remark } = param;
    const result = await prisma.sys_role.findMany({
      where: {
        id: {
          not: this.rootRoleId,
        },
        name: {
          contains: `${name ? name : ''}`,
        },
        label: {
          contains: `${label ? label : ''}`,
        },
        remark: {
          contains: `${remark ? remark : ''}`,
        },
      },
      orderBy: {
        id: 'asc',
      },
      take: limit,
      skip: page * limit,
    });
    return result;
  }

  /**
   * 根据用户id查找角色信息
   */
  async getRoleIdByUser(id: number): Promise<number[]> {
    const result = await prisma.sys_user_role.findMany({
      where: {
        userId: id,
      },
    });
    if (!isEmpty(result)) {
      return map(result, (v) => {
        return v.roleId;
      });
    }
    return [];
  }

  /**
   * 根据角色ID列表查找关联用户ID
   */
  async countUserIdByRole(ids: number[]): Promise<number | never> {
    if (includes(ids, this.rootRoleId)) {
      throw new Error('Not Support Delete Root');
    }
    return await prisma.sys_user_role.count({
      where: {
        roleId: {
          in: ids,
        },
      },
    });
  }
}
