/**
 * Class that represents the type of an object as returned by the REST server
 */
export class ResourceType {
  static Item: ResourceType;
  constructor(public value: string) {
  }
}
