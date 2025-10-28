import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  user = {
    email: '',
    password: '',
  };
  storedUser = {
    email: 'myke@gmail.com',
    password: '123456',
  };
  loginValid: boolean = true;
  router = inject(Router);

  validateLogin(email: string, password: string): boolean {
    return email === this.storedUser.email && password === this.storedUser.password;
  }

  login() {
    if (this.validateLogin(this.user.email, this.user.password)) {
      localStorage.setItem('loggedInUser', JSON.stringify(this.user.email));
      this.loginValid = true;
      this.router.navigate(['/dashboard']);
    } else {
      alert('Invalid email or password');
      this.loginValid = false;
    }
  }
}
