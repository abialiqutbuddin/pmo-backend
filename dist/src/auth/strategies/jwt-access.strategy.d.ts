import { Strategy } from 'passport-jwt';
import { AccessJwtClaims } from '../types';
declare const JwtAccessStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtAccessStrategy extends JwtAccessStrategy_base {
    constructor();
    validate(payload: AccessJwtClaims): AccessJwtClaims;
}
export {};
