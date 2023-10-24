import { Injectable } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';
import { LoginLogInfo, TaskLogInfo } from './log.class';
import { prisma } from 'src/prisma';
import { UtilService } from 'src/shared/services/util.service';

@Injectable()
export class SysLogService {
  constructor(private readonly utilService: UtilService) {}

  /**
   * 记录登录日志
   */
  async saveLoginLog(uid: number, ip: string, ua: string): Promise<void> {
    const loginLocation = await this.utilService.getLocation(
      ip.split(',').at(-1).trim(),
    );
    await prisma.sys_login_log.create({
      data: {
        ip,
        login_location: loginLocation,
        user_id: uid,
        ua,
      },
    });
  }

  /**
   * 计算登录日志日志总数
   */
  async countLoginLog(): Promise<number> {
    // const userIds = await this.userRepository
    //   .createQueryBuilder('user')
    //   .select(['user.id'])
    //   .getMany();
    // return await this.loginLogRepository.count({
    //   where: { userId: In(userIds.map((n) => n.id)) },
    // });
    return await prisma.sys_login_log.count();
  }

  /**
   * 分页加载日志信息
   */
  async pageGetLoginLog(page: number, count: number): Promise<LoginLogInfo[]> {
    // const result = await this.getRepo().admin.sys.LoginLog.find({
    //   order: {
    //     id: 'DESC',
    //   },
    //   take: count,
    //   skip: page * count,
    // });
    // const result = await this.loginLogRepository
    //   .createQueryBuilder('login_log')
    //   .innerJoinAndSelect('sys_user', 'user', 'login_log.user_id = user.id')
    //   .orderBy('login_log.created_at', 'DESC')
    //   .offset(page * count)
    //   .limit(count)
    //   .getRawMany();
    const result: any =
      await prisma.$queryRaw`SELECT * FROM sys_login_log INNER JOIN sys_user ON sys_login_log.user_id = sys_user.id order by sys_login_log.created_at DESC LIMIT ${
        page * count
      }, ${count}`;
    const parser = new UAParser();
    return result.map((e) => {
      const u = parser.setUA(e.login_log_ua).getResult();

      return {
        id: e.login_log_id,
        ip: e.login_log_ip,
        os: `${u.os.name} ${u.os.version}`,
        browser: `${u.browser.name} ${u.browser.version}`,
        time: e.login_log_created_at,
        username: e.user_username,
        loginLocation: e.login_log_login_location,
      };
    });
  }

  /**
   * 清空表中的所有数据
   */
  async clearLoginLog(): Promise<void> {
    await prisma.sys_login_log.deleteMany();
  }
  // ----- task

  /**
   * 记录任务日志
   */
  async recordTaskLog(
    tid: number,
    status: number,
    time?: number,
    err?: string,
  ): Promise<number> {
    const result = await prisma.sys_task_log.create({
      data: {
        task_id: tid,
        status,
        detail: err,
      },
    });
    return result.id;
  }

  /**
   * 计算日志总数
   */
  async countTaskLog(): Promise<number> {
    return await prisma.sys_task_log.count();
  }

  /**
   * 分页加载日志信息
   */
  async page(page: number, count: number): Promise<TaskLogInfo[]> {
    // const result = await this.getRepo().admin.sys.TaskLog.find({
    //   order: {
    //     id: 'DESC',
    //   },
    //   take: count,
    //   skip: page * count,
    // });
    // return result;
    const result: any =
      await prisma.$queryRaw`SELECT sys_task_log.*, sys_task.name 'task_name' FROM sys_task_log LEFT JOIN sys_task ON sys_task_log.task_id = sys_task.id order by sys_task_log.id DESC LIMIT ${
        page * count
      }, ${count}`;
    return result.map((e) => {
      return {
        id: e.task_log_id,
        taskId: e.task_id,
        name: e.task_name,
        createdAt: e.task_log_created_at,
        consumeTime: e.task_log_consume_time,
        detail: e.task_log_detail,
        status: e.task_log_status,
      };
    });
  }

  /**
   * 清空表中的所有数据
   */
  async clearTaskLog(): Promise<void> {
    await prisma.sys_task_log.deleteMany();
  }
}
