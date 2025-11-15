import 'reflect-metadata';
import { container } from 'tsyringe';
import { UserRepository } from './repositories/user.repository.js';

import { AuthMiddleware } from './middlewares/auth.middleware.js';
import { AuthService } from './services/auth/auth.service.js';
import { AuthController } from './controllers/auth/auth.controller.js';
import { IRingNumberService } from './services/ringNumber/ringNumber.service.interface.js';
import { RingNumberService } from './services/ringNumber/ringNumber.service.js';
import { IImageService } from './services/image/image.service.interface.js';
import { ImageService } from './services/image/image.service.js';

// Register repositories
container.registerSingleton('IUserRepository', UserRepository);

// Register services
container.registerSingleton('IAuthService', AuthService);
container.register<IRingNumberService>('IRingNumberService', { useClass: RingNumberService });
container.register<IImageService>('IImageService', { useClass: ImageService });
// Register controllers
container.registerSingleton('AuthController', AuthController);

// Register middlewares
container.registerSingleton('AuthMiddleware', AuthMiddleware);

export { container };
