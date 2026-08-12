import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Main } from './main';

describe('Main', () => {
  let component: Main;
  let fixture: ComponentFixture<Main>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Main],
    }).compileComponents();

    fixture = TestBed.createComponent(Main);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('labels the account actions', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('button[aria-label="Open account settings"]')).not.toBeNull();
    expect(element.querySelector('button[aria-label="Log out"]')).not.toBeNull();
  });

  it('keeps the future microphone control hidden', () => {
    const element = fixture.nativeElement as HTMLElement;
    const microphone = element.querySelector<HTMLButtonElement>('.future-microphone');

    expect(microphone).not.toBeNull();
    expect(microphone?.hidden).toBe(true);
  });
});
