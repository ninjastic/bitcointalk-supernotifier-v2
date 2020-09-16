export default interface IFindAddressesByAuthorDTO {
  username: string;
  limit?: number;
  last_address?: string;
  last_created_at?: Date;
  last_id?: string;
}
