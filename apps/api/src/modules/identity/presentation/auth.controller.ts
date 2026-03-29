import { Controller, Post, Body, Get, HttpCode, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString } from 'class-validator';
import { AuthService } from '../application/services/auth.service';
import { RegistrationService } from '../application/services/registration.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

class RegisterDto {
  @IsNotEmpty() @IsString() firstName: string;
  @IsNotEmpty() @IsString() lastName: string;
  @IsEmail() email: string;
  @MinLength(8) password: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() inviteCode?: string;
}

class LoginDto {
  @IsEmail() email: string;
  @IsNotEmpty() password: string;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsNotEmpty() @IsString() token: string;
  @MinLength(8) password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registrationService: RegistrationService,
  ) {}

  @Post('register')
  @SetMetadata('isPublic', true)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return this.registrationService.register(dto);
  }

  @Post('login')
  @SetMetadata('isPublic', true)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh JWT token' })
  async refresh(@CurrentUser('id') userId: string) {
    return this.authService.refreshToken(userId);
  }

  @Post('forgot-password')
  @SetMetadata('isPublic', true)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @SetMetadata('isPublic', true)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPasswordWithToken(dto.token, dto.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
