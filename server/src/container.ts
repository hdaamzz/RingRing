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
import { IContactService } from './services/contact/contact.service.interface.js';
import { ContactService } from './services/contact/contact.service.js';
import { IContactRepository } from './repositories/contact.repository.interface.js';
import { ContactRepository } from './repositories/contact.repository.js';
import { ICallRepository } from './repositories/call.repository.interface.js';
import { CallRepository } from './repositories/call.repository.js';
import { CallService } from './services/call/call.service.js';
import { ICallService } from './services/call/call.service.interface.js';

// Register repositories
container.registerSingleton('IUserRepository', UserRepository);
container.register<IContactRepository>('IContactRepository', { useClass: ContactRepository });
container.register<ICallRepository>('ICallRepository', { useClass: CallRepository });


// Register services
container.registerSingleton('IAuthService', AuthService);
container.register<IRingNumberService>('IRingNumberService', { useClass: RingNumberService });
container.register<IImageService>('IImageService', { useClass: ImageService });
container.register<IContactService>('IContactService', { useClass: ContactService });
container.register<ICallService>('ICallService', { useClass: CallService });

// Register controllers
container.registerSingleton('AuthController', AuthController);

// Register middlewares
container.registerSingleton('AuthMiddleware', AuthMiddleware);

export { container };
