interface Params {
  scope: string;
}

export default class ParseUsersScopeService {
  public execute({ scope }: Params): Array<string> {
    const matches = scope.match(/\[(.*?)\]/g);

    return matches;
  }
}
