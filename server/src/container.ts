import 'reflect-metadata';
import { container } from 'tsyringe';
import { UserRepository } from './repositories/user.repository.js';

import { AuthMiddleware } from './middlewares/auth.middleware.js';
import { AuthService } from './services/auth/auth.service.js';
import { AuthController } from './controllers/auth/auth.controller.js';
import { IRingNumberService } from './services/ringNumber/ringNumber.service.interface.js';
import { RingNumberService } from './services/ringNumber/ringNumber.service.js';

// Register repositories
container.registerSingleton('IUserRepository', UserRepository);

// Register services
container.registerSingleton('IAuthService', AuthService);
container.register<IRingNumberService>('IRingNumberService', { useClass: RingNumberService });

// Register controllers
container.registerSingleton('AuthController', AuthController);

// Register middlewares
container.registerSingleton('AuthMiddleware', AuthMiddleware);

export { container };
