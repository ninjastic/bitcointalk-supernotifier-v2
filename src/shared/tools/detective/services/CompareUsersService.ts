import 'dotenv/config';

import GetUserAddresses from './GetUserAddresses';
import GetUserSocials from './GetUserSocials';

interface Data {
  addresses: any;
}

class CompareUsersService {
  public async execute(
    firstAuthorUid: number,
    secondAuthorUid: number,
  ): Promise<Data> {
    // addresses
    const getUserAddresses = new GetUserAddresses();

    const firstAddresses = await getUserAddresses.execute({
      authorUid: firstAuthorUid,
      boards: [238],
      topics: [996318],
    });

    const secondAddresses = await getUserAddresses.execute({
      authorUid: secondAuthorUid,
      boards: [238],
      topics: [996318],
    });

    const addressesMatches = [];

    [
      ...firstAddresses.addresses.direct_only,
      ...firstAddresses.specified_topics.direct_only,
      ...firstAddresses.specified_boards.direct_only,
    ].forEach(firstResult => {
      [
        ...secondAddresses.addresses.direct_only,
        ...secondAddresses.specified_topics.direct_only,
        ...secondAddresses.specified_boards.direct_only,
      ].forEach(secondResult => {
        if (firstResult.address === secondResult.address) {
          const addressExistsIndex = addressesMatches.findIndex(
            a => a.address === secondResult.address,
          );

          if (addressExistsIndex === -1) {
            addressesMatches.push({
              address: secondResult.address,
              first: [firstResult],
              second: [secondResult],
            });
          } else {
            const firstExists = addressesMatches[addressExistsIndex].first.find(
              first => first.post_id === firstResult.post_id,
            );
            const secondExists = addressesMatches[
              addressExistsIndex
            ].second.find(second => second.post_id === secondResult.post_id);

            if (!firstExists) {
              addressesMatches[addressExistsIndex].first.push(firstResult);
            }
            if (!secondExists) {
              addressesMatches[addressExistsIndex].second.push(secondResult);
            }
          }
        }
      });
    });

    // socials

    const getUserSocials = new GetUserSocials();

    const firstSocials = await getUserSocials.execute({
      authorUid: firstAuthorUid,
    });
    const secondSocials = await getUserSocials.execute({
      authorUid: secondAuthorUid,
    });

    const socialMatches = {
      telegram: null,
      twitter: null,
      facebook: null,
    };

    firstSocials.forEach(firstSocial => {
      secondSocials.forEach(secondSocial => {
        if (
          firstSocial.socials.telegram &&
          firstSocial.socials.telegram === secondSocial.socials.telegram
        ) {
          if (!socialMatches.telegram) {
            socialMatches.telegram = {
              name: firstSocial.socials.telegram,
              first: [firstSocial.post],
              second: [secondSocial.post],
            };
          } else {
            const firstExists = socialMatches.telegram.first.find(
              first => first.post_id === firstSocial.post.post_id,
            );
            const secondExists = socialMatches.telegram.second.find(
              second => second.post_id === secondSocial.post.post_id,
            );

            if (!firstExists) {
              socialMatches.telegram.first.push(firstSocial.post);
            }
            if (!secondExists) {
              socialMatches.telegram.first.push(secondSocial.post);
            }
          }
        }

        if (
          firstSocial.socials.twitter &&
          firstSocial.socials.twitter === secondSocial.socials.twitter
        ) {
          if (!socialMatches.twitter) {
            socialMatches.twitter = {
              name: firstSocial.socials.twitter,
              first: [firstSocial.post],
              second: [secondSocial.post],
            };
          } else {
            const firstExists = socialMatches.twitter.first.find(
              first => first.post_id === firstSocial.post.post_id,
            );
            const secondExists = socialMatches.twitter.second.find(
              second => second.post_id === secondSocial.post.post_id,
            );

            if (!firstExists) {
              socialMatches.twitter.first.push(firstSocial.post);
            }
            if (!secondExists) {
              socialMatches.twitter.first.push(secondSocial.post);
            }
          }
        }

        if (
          firstSocial.socials.facebook &&
          firstSocial.socials.facebook === secondSocial.socials.facebook
        ) {
          if (!socialMatches.facebook) {
            socialMatches.facebook = {
              name: firstSocial.socials.facebook,
              first: [firstSocial.post],
              second: [secondSocial.post],
            };
          } else {
            const firstExists = socialMatches.facebook.first.find(
              first => first.post_id === firstSocial.post.post_id,
            );
            const secondExists = socialMatches.facebook.second.find(
              second => second.post_id === secondSocial.post.post_id,
            );

            if (!firstExists) {
              socialMatches.facebook.first.push(firstSocial.post);
            }
            if (!secondExists) {
              socialMatches.facebook.first.push(secondSocial.post);
            }
          }
        }
      });
    });

    //

    const data = {
      addresses: addressesMatches,
      socials: socialMatches,
    };

    return data;
  }
}

export default CompareUsersService;
