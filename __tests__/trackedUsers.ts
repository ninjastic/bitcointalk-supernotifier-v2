import TrackedUsersRepository from '../src/modules/posts/infra/typeorm/repositories/TrackedUsersRepository';

test('should not create trackedUser if is profile url', () => {
  const trackedUsersRepository = new TrackedUsersRepository();

  expect(
    trackedUsersRepository.create({
      telegram_id: '12345678',
      username: 'https://bitcointalk.org/index.php?action=profile;u=3',
      only_topics: false
    })
  ).toThrowError();
});
