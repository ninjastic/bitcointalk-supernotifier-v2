import WebUser from '../infra/typeorm/entities/WebUser';
import ICreateWebUserDTO from '../dtos/ICreateWebUserDTO';
import IFindWebUsersDTO from '../dtos/IFindWebUsersDTO';

export default interface IWebUsersRepository {
  create(data: ICreateWebUserDTO): WebUser;
  save(webUser: WebUser): Promise<WebUser>;
  findOne(conditions: IFindWebUsersDTO): Promise<WebUser | undefined>;
  findAll(): Promise<WebUser[]>;
}
