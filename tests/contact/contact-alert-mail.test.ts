import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
const transport=vi.hoisted(()=>({send:vi.fn()}));
vi.mock("resend",()=>({Resend:class{emails={send:transport.send};}}));
beforeEach(()=>{vi.resetModules();vi.stubEnv('CONTACT_ALERT_EMAIL','owner@example.test');vi.stubEnv('RESEND_API_KEY','mock-only');vi.stubEnv('EMAIL_FROM','FitOut <verified@example.test>');transport.send.mockReset().mockResolvedValue({data:{id:'accepted'},error:null});});
afterEach(()=>{vi.unstubAllEnvs();});
describe('Contact alert transport',()=>{
  it('uses a fixed configured recipient, sanitized incident-only content and stable provider deduplication key',async()=>{
    const {sendContactControlAlert}=await import('@/lib/contact-alert-mail');const alert={id:'synthetic-id',kind:'global_budget' as const,observedAt:'2026-10-11T00:00:00.000Z',synthetic:true};
    expect(await sendContactControlAlert(alert)).toBe('accepted');await sendContactControlAlert(alert);
    expect(transport.send.mock.calls[0]).toEqual(transport.send.mock.calls[1]);
    expect(transport.send.mock.calls[0][0]).toMatchObject({to:'owner@example.test',subject:'[Synthetic test] FitOut Contact alert: hourly quota exhausted'});
    expect(transport.send.mock.calls[0][1]).toEqual({idempotencyKey:'contact-alert/synthetic-id'});
    expect(transport.send.mock.calls[0][0].text).toContain('No Contact inquiry was sent');
  });
  it.each([{data:null,error:null},{data:null,error:{message:'private'}}])('rejects missing acceptance so the scheduler retries',async response=>{
    transport.send.mockResolvedValue(response);const {sendContactControlAlert}=await import('@/lib/contact-alert-mail');
    await expect(sendContactControlAlert({id:'id',kind:'quota_unavailable',observedAt:'2026-10-11T00:00:00.000Z'})).rejects.toThrow('Contact alert delivery failed');
  });
  it('has no development success fallback',async()=>{vi.stubEnv('RESEND_API_KEY','');const {sendContactControlAlert}=await import('@/lib/contact-alert-mail');await expect(sendContactControlAlert({id:'id',kind:'global_budget',observedAt:'2026-10-11T00:00:00.000Z'})).rejects.toThrow('not configured');expect(transport.send).not.toHaveBeenCalled();});
  it('runs while production Contact is disabled but never in Preview',async()=>{const {contactAlertMonitorEnabled}=await import('@/lib/contact-alert-mail');vi.stubEnv('NODE_ENV','production');vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('CONTACT_PRODUCTION_ENABLED','false');expect(contactAlertMonitorEnabled()).toBe(true);vi.stubEnv('VERCEL_ENV','preview');expect(contactAlertMonitorEnabled()).toBe(false);});
});
