import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from './shell/nav/nav';

@Component({
  imports: [RouterOutlet, Nav],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = 'Time Logging App';
}
