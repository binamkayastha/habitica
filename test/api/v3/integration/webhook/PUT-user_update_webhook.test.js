import { v4 as generateUUID } from 'uuid';
import {
  generateUser,
  translate as t,
} from '../../../../helpers/api-integration/v3';
import apiError from '../../../../../website/server/libs/apiError';

describe('PUT /user/webhook/:id', () => {
  let user; let
    webhookToUpdate;

  beforeEach(async () => {
    user = await generateUser();

    webhookToUpdate = await user.post('/user/webhook', {
      url: 'http://some-url.com',
      label: 'Original Label',
      enabled: true,
      type: 'taskActivity',
      options: { created: true, scored: true },
    });
    await user.post('/user/webhook', {
      url: 'http://some-other-url.com',
      enabled: false,
    });

    await user.sync();
  });

  it('returns an error if webhook with id does not exist', async () => {
    await expect(user.put('/user/webhook/id-that-does-not-exist')).to.eventually.be.rejected.and.eql({
      code: 404,
      error: 'NotFound',
      message: t('noWebhookWithId', { id: 'id-that-does-not-exist' }),
    });
  });

  it('returns an error if validation fails', async () => {
    await expect(user.put(`/user/webhook/${webhookToUpdate.id}`, { url: 'foo_invalid', enabled: true })).to.eventually.be.rejected.and.eql({
      code: 400,
      error: 'BadRequest',
      message: 'User validation failed',
    });
  });

  it('updates a webhook', async () => {
    const url = 'http://a-new-url.com';
    const type = 'groupChatReceived';
    const label = 'New Label';
    const options = { groupId: generateUUID() };

    await user.put(`/user/webhook/${webhookToUpdate.id}`, {
      url, type, options, label,
    });

    await user.sync();

    const webhook = user.webhooks.find(hook => webhookToUpdate.id === hook.id);

    expect(webhook.url).to.equal(url);
    expect(webhook.label).to.equal(label);
    expect(webhook.type).to.equal(type);
    expect(webhook.options).to.eql(options);
  });

  it('returns the updated webhook', async () => {
    const url = 'http://a-new-url.com';
    const type = 'groupChatReceived';
    const options = { groupId: generateUUID() };

    const response = await user.put(`/user/webhook/${webhookToUpdate.id}`, { url, type, options });

    expect(response.url).to.eql(url);
    expect(response.type).to.eql(type);
    expect(response.options).to.eql(options);
  });

  it('cannot update the id', async () => {
    const id = generateUUID();
    const url = 'http://a-new-url.com';

    await user.put(`/user/webhook/${webhookToUpdate.id}`, { url, id });

    await user.sync();

    const webhook = user.webhooks.find(hook => webhookToUpdate.id === hook.id);

    expect(webhook.id).to.eql(webhookToUpdate.id);
    expect(webhook.url).to.eql(url);
  });

  it('can update taskActivity options', async () => {
    const type = 'taskActivity';
    const options = {
      updated: false,
      deleted: true,
    };

    const webhook = await user.put(`/user/webhook/${webhookToUpdate.id}`, { type, options });

    expect(webhook.options).to.eql({
      checklistScored: false, // starting value
      created: true, // starting value
      updated: false,
      deleted: true,
      scored: true, // default value
    });
  });

  it('errors if taskActivity option is not a boolean', async () => {
    const type = 'taskActivity';
    const options = {
      created: 'not a boolean',
      updated: false,
      deleted: true,
    };

    await expect(user.put(`/user/webhook/${webhookToUpdate.id}`, { type, options })).to.eventually.be.rejected.and.eql({
      code: 400,
      error: 'BadRequest',
      message: t('webhookBooleanOption', { option: 'created' }),
    });
  });

  it('errors if groupChatRecieved groupId option is not a uuid', async () => {
    const type = 'groupChatReceived';
    const options = {
      groupId: 'not-a-uuid',
    };

    await expect(user.put(`/user/webhook/${webhookToUpdate.id}`, { type, options })).to.eventually.be.rejected.and.eql({
      code: 400,
      error: 'BadRequest',
      message: apiError('groupIdRequired'),
    });
  });
});
