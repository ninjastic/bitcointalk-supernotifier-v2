import { injectable, inject } from 'tsyringe';

import IAddressesRepository from '../repositories/IAddressesRepository';

import Address from '../infra/typeorm/entities/Address';
import ICreateAddressDTO from '../dtos/ICreateAddressDTO';

@injectable()
export default class CreateAddressService {
  constructor(
    @inject('AddressesRepository')
    private addressesRepository: IAddressesRepository,
  ) {}

  public execute(address: ICreateAddressDTO): Address {
    const addressCreated = this.addressesRepository.create(address);

    return addressCreated;
  }
}
