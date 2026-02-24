import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, name: dto.name },
    });
    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.generateTokens(user.id, user.email, user.role);
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedException();
    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException();
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;
    return user;
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-change-in-prod'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRY', '7d'),
    });
    const hashed = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
    return { accessToken, refreshToken, userId };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, credits: true, createdAt: true },
    });
  }
}
