import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import PostgresErrorCode from "../database/postgres-error-codes.enum";
import RegisterDto from './dto/register.dto';
import TokenPayload from './token-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthenticationService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) { }

    /**
     * @Function for registering a new user
     * @param registrationData Data of the new user to be registered
     * @returns The data of the registered users
     */
    public async register(registrationData: RegisterDto) {
        const hashedPassword = await bcrypt.hash(registrationData.password, 10);
        try {
            const createdUser = await this.usersService.create({
                ...registrationData,
                password: hashedPassword
            });
            return createdUser;
        } catch (error) {
            if (error?.code === PostgresErrorCode.UniqueViolation) {
                throw new HttpException('User with that email already exists', HttpStatus.BAD_REQUEST);
            }
            throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * @Function to get an access token cookie
     * @param userId An id of a user. A user with this id should exist in the database
     * @returns an access token cookie
     */
    public getCookieWithJwtAccessToken(userId: number) {
        const payload: TokenPayload = { userId };
        const token = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
            expiresIn: `${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`
        });
        return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_EXPIRATION_TIME')}`;
    }

    /**
     * @Function to get a refresh token cookie
     * @param userId An id of a user. A user with this id should exist in the database
     * @returns a refresh token cookie
     */
    public getCookieWithJwtRefreshToken(userId: number) {
        const payload: TokenPayload = { userId };
        const token = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
            expiresIn: `${this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME')}s`
        });
        const cookie = `Refresh=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_EXPIRATION_TIME')}`;
        return {
            cookie,
            token
        };
    }

    /**
     * @Function to get empty access and refresh token cookie
     * @returns cookie with empty value
     */
    public getCookieForLogOut() {
        return [
            'Authentication=; HttpOnly; Path=/; Max-Age=0',
            'Refresh=; HttpOnly; Path=/; Max-Age=0'
        ];
    }

    /**
     * @Function to get the authenticated user.
     * @param email An email id of a user. User with this email id should exist in the database
     * @param plainTextPassword The plain text password of a user. The hash of this plain text password should match the hashed password in the database
     * @returns the details of the user
     */
    public async getAuthenticatedUser(email: string, plainTextPassword: string) {
        try {
            const user = await this.usersService.getByEmail(email);
            await this.verifyPassword(plainTextPassword, user.password);
            return user;
        } catch (error) {
            throw new HttpException('Wrong credentials provided', HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * @HelperFunction to verify if the plain text password matches the hashed password in the database
     * @param plainTextPassword The plain text password to be compared with the hashed password
     * @param hashedPassword The hashed password of a user from the database
     */
    private async verifyPassword(plainTextPassword: string, hashedPassword: string) {
        const isPasswordMatching = await bcrypt.compare(plainTextPassword, hashedPassword);
        if (!isPasswordMatching) {
            throw new HttpException('Wrong credential provided', HttpStatus.BAD_REQUEST);
        }
    };
}
