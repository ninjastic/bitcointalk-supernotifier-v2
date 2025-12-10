import { inject, injectable } from 'tsyringe';

import type ICreateAddressDTO from '../dtos/ICreateAddressDTO';
import type Address from '../infra/typeorm/entities/Address';
import type IAddressesRepository from '../repositories/IAddressesRepository';

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
