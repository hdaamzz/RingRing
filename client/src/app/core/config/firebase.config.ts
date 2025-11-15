import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { environment } from '../environment/environment';


const app = initializeApp(environment.firebase);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();