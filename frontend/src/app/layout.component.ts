import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, MatToolbarModule],
  template: `
    <mat-toolbar color="primary">
      <span>Passkeys Demo</span>
    </mat-toolbar>

    <div class="w-full mt-6 text-center text-lg">
      <span class="underline text-indigo-500 cursor-pointer"
        ><a routerLink="/login">Login</a></span
      >
      <span class="mx-2">|</span>
      <span class="underline text-indigo-500 cursor-pointer"
        ><a routerLink="/device-register">Device Register</a></span
      >
    </div>

    <div class="w-full mt-6 text-center">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [],
})
export class LayoutComponent {}
