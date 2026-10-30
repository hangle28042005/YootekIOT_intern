import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let module: TestingModule;
  let controller: AuthController;
  let authService: {
    register: ReturnType<typeof jest.fn>;
    login: ReturnType<typeof jest.fn>;
  };

  beforeEach(async () => {
    authService = { register: jest.fn(), login: jest.fn() };
    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get(AuthController);
  });

  afterEach(async () => {
    await module.close();
  });

  it('forwards register data to AuthService', async () => {
    const dto = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
    };
    const response = { message: 'Register successful', user: { id: 1 } };
    authService.register.mockResolvedValueOnce(response);
    await expect(controller.register(dto)).resolves.toEqual(response);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('forwards login data to AuthService', async () => {
    const dto = { email: 'alice@example.com', password: 'secret123' };
    const response = {
      message: 'Login successful',
      access_token: 'signed-token',
      token_type: 'Bearer',
    };
    authService.login.mockResolvedValueOnce(response);
    await expect(controller.login(dto)).resolves.toEqual(response);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });
});
