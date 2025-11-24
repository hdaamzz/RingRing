import { HttpInterceptorFn } from '@angular/common/http';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem('authToken');
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    return next(authReq);
  }
  const cookieReq = req.clone({ withCredentials: true });
  return next(cookieReq);
};

