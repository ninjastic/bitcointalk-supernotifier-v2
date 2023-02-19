import { Context } from 'grammy';
import ISession from './ISession';

export default interface IMenuContext extends Context {
  session: ISession;
}
