import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AssignmentsService, CreateAssignmentDto, TransferWorkerDto } from './assignments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get worker assignments filtered by site, worker or status' })
  async findAll(
    @Query('workSiteId') workSiteId: string,
    @Query('workerId') workerId: string,
    @Query('status') status: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findAll({ workSiteId, workerId, status }, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment details by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Assign a worker to a work site and shift' })
  async create(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.create(dto, user, ip);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transfer worker from one location to another with effective date' })
  async transfer(
    @Param('id') id: string,
    @Body() dto: TransferWorkerDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.transfer(id, dto, user, ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update assignment details' })
  async update(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.update(id, dto, user, ip);
  }
}
