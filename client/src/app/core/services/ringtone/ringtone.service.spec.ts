import { TestBed } from '@angular/core/testing';

import { RingtoneService } from './ringtone.service';

describe('RingtoneService', () => {
  let service: RingtoneService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RingtoneService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
