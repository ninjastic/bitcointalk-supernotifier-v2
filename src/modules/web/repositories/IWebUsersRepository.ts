import WebUser from '../infra/typeorm/entities/WebUser';
import ICreateWebUserDTO from '../dtos/ICreateWebUserDTO';

export default interface IWebUsersRepository {
  create(data: ICreateWebUserDTO): WebUser;
  save(webUser: WebUser): Promise<WebUser>;
  findOneByUsername(username: string): Promise<WebUser | undefined>;
  findAll(): Promise<WebUser[]>;
}
