import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard,ThrottlerException,ThrottlerLimitDetail } from "@nestjs/throttler";
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard{
    protected  async getTracker(req: Record<string, any>): Promise<string> {
        const email=req.body?.email||"anonymous";
        return `login-${email}`
        
    }
    protected getLimit():Promise<number>{
        return Promise.resolve(5);
    }
    protected getTle():Promise<number>{
        return Promise.resolve(60000);
    }
    protected async throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: ThrottlerLimitDetail): Promise<void> {
        throw new ThrottlerException(
            'too many Attempts .Please try Again after 1 min'
        )
    }
}