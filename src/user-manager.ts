import { IUserManager, ServerSession, UserManagerOptions, ValidUserFunc } from "node-opcua";


export class UserManager implements UserManagerOptions {

    private users: {[key: string] : string} = {
        "john": "john_pw",
        "jane": "jane_pw"
    }

    public isValidUser =  (username: string, password: string): boolean  =>{
        return (this.users?.[username] === password);
    }
}