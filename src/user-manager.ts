import { IUserManagerEx } from "node-opcua";


// node-opcua's `UserManagerOptions` is now a union type
// (`IUserManagerEx | UAUserManagerBase`) which cannot be `implements`-ed.
// We implement the plain object variant instead.
export class UserManager implements IUserManagerEx {

    private users: {[key: string] : string} = {
        "john": "john_pw",
        "jane": "jane_pw"
    }

    public isValidUser =  (username: string, password: string): boolean  =>{
        return (this.users?.[username] === password);
    }
}