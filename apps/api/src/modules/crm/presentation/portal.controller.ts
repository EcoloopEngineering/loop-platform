import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString } from 'class-validator';
import { PortalAuthService } from '../application/services/portal-auth.service';

export class PortalRegisterDto {
  @IsNotEmpty() @IsString() firstName: string;
  @IsNotEmpty() @IsString() lastName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @MinLength(8) password: string;
}

export class PortalLoginDto {
  @IsEmail() email: string;
  @IsNotEmpty() password: string;
}

export class PortalForgotPasswordDto {
  @IsEmail() email: string;
}

export class PortalResetPasswordDto {
  @IsNotEmpty() @IsString() token: string;
  @MinLength(8) password: string;
}

@ApiTags('Customer Portal')
@Controller('portal')
export class PortalController {
  constructor(private readonly portalAuth: PortalAuthService) {}

  @Post('auth/register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new customer account' })
  async register(@Body() dto: PortalRegisterDto) {
    return this.portalAuth.register(dto);
  }

  @Post('auth/login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Customer login' })
  async login(@Body() dto: PortalLoginDto) {
    return this.portalAuth.login(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current customer profile (requires portal token)' })
  async getMe(@Req() req: { headers: { authorization?: string } }) {
    return this.portalAuth.getMe(req.headers.authorization);
  }

  @Post('auth/forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() dto: PortalForgotPasswordDto) {
    return this.portalAuth.forgotPassword(dto.email);
  }

  @Post('auth/reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset customer password using token' })
  async resetPassword(@Body() dto: PortalResetPasswordDto) {
    return this.portalAuth.resetPassword(dto.token, dto.password);
  }
}
