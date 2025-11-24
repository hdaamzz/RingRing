import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contact, SearchUserResult } from '../../interfaces/contact';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private http = inject(HttpClient);
  private api=environment.api_url
  

  searchUser(ringNumber: string): Observable<{ user: SearchUserResult }> {
    return this.http.get<{ user: SearchUserResult }>(
      `${this.api}/api/contacts/search?ringNumber=${ringNumber}`
    );
  }

  getContacts(): Observable<{ contacts: Contact[] }> {
    return this.http.get<{ contacts: Contact[] }>(
      `${this.api}/api/contacts`
    );
  }

  addContact(ringNumber: string): Observable<{ message: string; contact: Contact }> {
    return this.http.post<{ message: string; contact: Contact }>(
      `${this.api}/api/contacts`,
      { ringNumber }
    );
  }

  updateContact(contactId: string, data: Partial<Contact>): Observable<{ message: string; contact: Contact }> {
    return this.http.put<{ message: string; contact: Contact }>(
      `${this.api}/api/contacts/${contactId}`,
      data
    );
  }

  deleteContact(contactId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.api}/api/contacts/${contactId}`
    );
  }

  toggleFavorite(contactId: string): Observable<{ message: string; contact: Contact }> {
    return this.http.patch<{ message: string; contact: Contact }>(
      `${this.api}/api/contacts/${contactId}/favorite`,
      {}
    );
  }

  blockContact(contactId: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.api}/api/contacts/${contactId}/block`,
      {}
    );
  }
}