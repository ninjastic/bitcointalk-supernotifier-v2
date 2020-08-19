export default interface ICacheProvider {
  save(key: string, value: any, arg?: string, time?: number): Promise<void>;
  recover<T>(key: string): Promise<T | null>;
  invalidate(key: string): Promise<void>;
}
