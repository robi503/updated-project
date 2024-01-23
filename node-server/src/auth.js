import Router from 'koa-router';
import jwt from 'jsonwebtoken';
import dataStore from "nedb-promise";
import { jwtConfig } from './utils.js';

export class UserStore {
  constructor({ filename, autoload }) {
    this.store = dataStore({ filename, autoload });
  }

  async findOne(props) {
    return this.store.findOne(props);
  }

  async insert(user) {
    return this.store.insert(user);
  };
}

const userStore = new UserStore({ filename: './db/users.json', autoload: true });

const createToken = (user) => {
  return jwt.sign({ username: user.username, _id: user._id }, jwtConfig.secret, { expiresIn: 60 * 60 * 60 });
};

export const authRouter = new Router();

authRouter.post('/signup', async (ctx) => {
  try {
    const user = ctx.request.body;
    const existingUser = await userStore.findOne({ username: user.username });
    if (existingUser) {
      ctx.response.body = { error: 'User already exists' };
      ctx.response.status = 409; // bad request
      return;
    }

    const insertedUser = await userStore.insert(user);
    ctx.response.body = { token: createToken(insertedUser) };
    ctx.response.status = 201; // created
  } catch (err) {
    ctx.response.body = { error: err.message };
    ctx.response.status = 400; // bad request
  }
});


authRouter.post('/login', async (ctx) => {
  const credentials = ctx.request.body;
  const user = await userStore.findOne({ username: credentials.username });
  if (user && credentials.password === user.password) {
    ctx.response.body = {
      token: createToken(user),
      user: {
        username: user.username,
        // include other non-sensitive user information if necessary
      }
    };
    ctx.response.status = 201; // created
  } else {
    ctx.response.body = {
      error: 'Invalid credentials',
      providedCredentials: {
        username: credentials.username,
        password: credentials.password,
      },
    };
    ctx.response.status = 400; // bad request
  }
});

