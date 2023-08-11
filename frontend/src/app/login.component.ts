import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { startAuthentication } from '@simplewebauthn/browser';
import { defer, of, switchMap } from 'rxjs';
import { DialogService } from './dialog.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="text-3xl">User Login</div>

    <mat-form-field>
      <mat-label>Username</mat-label>
      <input matInput [formControl]="username" />
    </mat-form-field>

    <div>
      <button mat-raised-button color="primary" (click)="login()">Login</button>
    </div>
  `,
  styles: [],
})
export default class LoginComponent {
  private http = inject(HttpClient);
  private dialogService = inject(DialogService);

  protected username = new FormControl('mike');

  private deviceAuthentication(options: any) {
    return defer(() => startAuthentication(options));
  }

  private getLoginOptions(username: string) {
    return this.http.post<any>('http://localhost:3000/login/start', {
      username,
    });
  }

  private finishLogin(username: string, data: any) {
    return this.http.post<any>('http://localhost:3000/login/finish', {
      username,
      data,
    });
  }

  async login() {
    const username = this.username.value || '';
    if (!username) {
      return;
    }

    of(username)
      .pipe(
        // 1. 從後端取得登入裝置時使用 WebAuthn 需要的設定資訊
        switchMap((username) => this.getLoginOptions(username)),
        // 2. 使用 WebAuthn API 驗證裝置
        switchMap((options) => this.deviceAuthentication(options)),
        // 3. 將裝置驗證結果傳回後端
        switchMap((data) => this.finishLogin(username, data))
      )
      .subscribe({
        next: (success: any) => {
          console.log(success);
          this.dialogService.openDialog('Login success', 'Welcome', 'done');
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
