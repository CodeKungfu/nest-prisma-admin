import { Injectable } from '@nestjs/common';
import { ApiException } from 'src/common/exceptions/api.exception';
import { CreateParamConfigDto, UpdateParamConfigDto } from './param-config.dto';
import { prisma } from 'src/prisma';
import { sys_config } from '@prisma/client';

@Injectable()
export class SysParamConfigService {
  /**
   * 罗列所有配置
   */
  async getConfigListByPage(
    page: number,
    count: number,
  ): Promise<sys_config[]> {
    return await prisma.sys_config.findMany({
      take: count,
      skip: page * count,
      orderBy: {
        id: 'asc',
      },
    });
  }

  /**
   * 获取参数总数
   */
  async countConfigList(): Promise<number> {
    return await prisma.sys_config.count();
  }

  /**
   * 新增
   */
  async add(dto: CreateParamConfigDto): Promise<void> {
    await prisma.sys_config.create({
      data: dto,
    });
  }

  /**
   * 更新
   */
  async update(dto: UpdateParamConfigDto): Promise<void> {
    await prisma.sys_config.update({
      data: { name: dto.name, value: dto.value, remark: dto.remark },
      where: {
        id: dto.id,
      },
    });
  }

  /**
   * 删除
   */
  async delete(ids: number[]): Promise<void> {
    await prisma.sys_config.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  /**
   * 查询单个
   */
  async findOne(id: number): Promise<sys_config> {
    return await prisma.sys_config.findUnique({
      where: {
        id,
      },
    });
  }

  async isExistKey(key: string): Promise<void | never> {
    const result = await prisma.sys_config.findUnique({
      where: {
        key,
      },
    });
    if (result) {
      throw new ApiException(10021);
    }
  }

  async findValueByKey(key: string): Promise<string | null> {
    const result = await prisma.sys_config.findUnique({
      where: {
        key,
      },
      select: {
        value: true,
      },
    });
    if (result) {
      return result.value;
    }
    return null;
  }
}
