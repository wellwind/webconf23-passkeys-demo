import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { startRegistration } from '@simplewebauthn/browser';
import { defer, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DialogService } from './dialog.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="text-3xl">Device Register</div>

    <mat-form-field>
      <mat-label>Username</mat-label>
      <input matInput [formControl]="username" />
    </mat-form-field>

    <div>
      <button mat-raised-button color="primary" (click)="register()">
        Register
      </button>
    </div>
  `,
  styles: [],
})
export default class DeviceRegisterComponent {
  private http = inject(HttpClient);
  private dialogService = inject(DialogService);

  protected username = new FormControl('mike');

  private registerDevice(options: any) {
    return defer(() => startRegistration(options));
  }

  private getRegistrationOptions(username: string) {
    return this.http.post<any>('http://localhost:3000/device-register/start', {
      username,
    });
  }

  private finishRegistration(username: string, data: any) {
    return this.http.post<boolean>(
      'http://localhost:3000/device-register/finish',
      { username, data }
    );
  }

  async register() {
    const username = this.username.value || '';
    if (!username) {
      return;
    }

    of(username)
      .pipe(
        // 1. 從後端取得註冊裝置時使用 WebAuthn 需要的設定資訊
        switchMap((username) => this.getRegistrationOptions(username)),
        // 2. 使用 WebAuthn API 註冊裝置
        switchMap((options) => this.registerDevice(options)),
        // 3. 將裝置註冊資訊傳回後端
        switchMap((data) => this.finishRegistration(username, data))
      )
      .subscribe({
        next: (success: boolean) => {
          if (success) {
            console.log(success);
            this.dialogService.openDialog(
              'Register success',
              'success',
              'done'
            );
          }
        },
        error: (error) => {
          console.error(error);
          if (error.name === 'NotAllowedError') {
            this.dialogService.openDialog(
              'cancel or timed out',
              'Fail',
              'error'
            );
          } else if (error instanceof HttpErrorResponse) {
            this.dialogService.openDialog(error.error.error, 'Fail', 'error');
          } else {
            this.dialogService.openDialog('Unknown error', 'Fail', 'error');
          }
        },
      });
  }
}
