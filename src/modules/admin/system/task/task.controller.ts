import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { isEmpty } from 'lodash';
import { PaginatedResponseDto } from 'src/common/class/res.class';
import { PageOptionsDto } from 'src/common/dto/page.dto';
import { ApiException } from 'src/common/exceptions/api.exception';
import { sys_task } from '@prisma/client';
import { ADMIN_PREFIX } from '../../admin.constants';
import { CheckIdTaskDto, CreateTaskDto, UpdateTaskDto } from './task.dto';
import { SysTaskService } from './task.service';

@ApiSecurity(ADMIN_PREFIX)
@ApiTags('任务调度模块')
@Controller('task')
export class SysTaskController {
  constructor(private taskService: SysTaskService) {}

  @ApiOperation({ summary: '获取任务列表' })
  @ApiOkResponse()
  @Get('page')
  async page(
    @Query() dto: PageOptionsDto,
  ): Promise<PaginatedResponseDto<sys_task>> {
    const list = await this.taskService.page(dto.page - 1, dto.limit);
    const count = await this.taskService.count();
    return {
      list,
      pagination: {
        total: count,
        size: dto.limit,
        page: dto.page,
      },
    };
  }

  @ApiOperation({ summary: '添加任务' })
  @Post('add')
  async add(@Body() dto: CreateTaskDto): Promise<void> {
    const serviceCall = dto.service.split('.');
    await this.taskService.checkHasMissionMeta(serviceCall[0], serviceCall[1]);
    await this.taskService.addOrUpdate(dto);
  }

  @ApiOperation({ summary: '更新任务' })
  @Post('update')
  async update(@Body() dto: UpdateTaskDto): Promise<void> {
    const serviceCall = dto.service.split('.');
    await this.taskService.checkHasMissionMeta(serviceCall[0], serviceCall[1]);
    await this.taskService.addOrUpdate(dto);
  }

  @ApiOperation({ summary: '查询任务详细信息' })
  @ApiOkResponse()
  @Get('info')
  async info(@Query() dto: CheckIdTaskDto): Promise<sys_task> {
    return await this.taskService.info(dto.id);
  }

  @ApiOperation({ summary: '手动执行一次任务' })
  @Post('once')
  async once(@Body() dto: CheckIdTaskDto): Promise<void> {
    const task = await this.taskService.info(dto.id);
    if (!isEmpty(task)) {
      await this.taskService.once(task);
    } else {
      throw new ApiException(10020);
    }
  }

  @ApiOperation({ summary: '停止任务' })
  @Post('stop')
  async stop(@Body() dto: CheckIdTaskDto): Promise<void> {
    const task = await this.taskService.info(dto.id);
    if (!isEmpty(task)) {
      await this.taskService.stop(task);
    } else {
      throw new ApiException(10020);
    }
  }

  @ApiOperation({ summary: '启动任务' })
  @Post('start')
  async start(@Body() dto: CheckIdTaskDto): Promise<void> {
    const task = await this.taskService.info(dto.id);
    if (!isEmpty(task)) {
      await this.taskService.start(task);
    } else {
      throw new ApiException(10020);
    }
  }

  @ApiOperation({ summary: '删除任务' })
  @Post('delete')
  async delete(@Body() dto: CheckIdTaskDto): Promise<void> {
    const task = await this.taskService.info(dto.id);
    if (!isEmpty(task)) {
      await this.taskService.delete(task);
    } else {
      throw new ApiException(10020);
    }
  }
}
