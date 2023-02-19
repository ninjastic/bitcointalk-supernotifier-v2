import 'dotenv/config';

import GetUserAddresses from './GetUserAddresses';
import GetUserSocials from './GetUserSocials';

interface Data {
  addresses: any;
  socials: any;
}

class CompareUsersService {
  public async execute(firstAuthorUid: number, secondAuthorUid: number): Promise<Data> {
    // addresses
    const getUserAddresses = new GetUserAddresses();

    const firstAddresses = await getUserAddresses.execute({
      authorUid: firstAuthorUid,
      boards: [238],
      topics: [996318]
    });

    const secondAddresses = await getUserAddresses.execute({
      authorUid: secondAuthorUid,
      boards: [238],
      topics: [996318]
    });

    const addressesMatches = [];

    firstAddresses.addresses.direct_only.forEach(firstResult => {
      secondAddresses.addresses.direct_only.forEach(secondResult => {
        if (firstResult.address === secondResult.address) {
          const addressExistsIndex = addressesMatches.findIndex(a => a.address === secondResult.address);

          if (addressExistsIndex === -1) {
            addressesMatches.push({
              address: secondResult.address,
              coin: secondResult.coin,
              first: [firstResult],
              second: [secondResult]
            });
          } else {
            const firstExists = addressesMatches[addressExistsIndex].first.find(
              first => first.post_id === firstResult.post_id
            );
            const secondExists = addressesMatches[addressExistsIndex].second.find(
              second => second.post_id === secondResult.post_id
            );

            if (!firstExists && addressesMatches[addressExistsIndex].first.length < 10) {
              addressesMatches[addressExistsIndex].first.push(firstResult);
            }
            if (!secondExists && addressesMatches[addressExistsIndex].second.length < 10) {
              addressesMatches[addressExistsIndex].second.push(secondResult);
            }
          }
        }
      });
    });

    // socials

    const getUserSocials = new GetUserSocials();

    const firstSocials = await getUserSocials.execute({
      authorUid: firstAuthorUid
    });
    const secondSocials = await getUserSocials.execute({
      authorUid: secondAuthorUid
    });

    const socialMatches = {
      telegram: null,
      twitter: null,
      facebook: null
    };

    firstSocials.forEach(firstSocial => {
      secondSocials.forEach(secondSocial => {
        if (firstSocial.socials.telegram && firstSocial.socials.telegram === secondSocial.socials.telegram) {
          if (!socialMatches.telegram) {
            socialMatches.telegram = {
              name: firstSocial.socials.telegram,
              first: [firstSocial.post],
              second: [secondSocial.post]
            };
          } else {
            const firstExists = socialMatches.telegram.first.find(first => first.post_id === firstSocial.post.post_id);
            const secondExists = socialMatches.telegram.second.find(
              second => second.post_id === secondSocial.post.post_id
            );

            if (!firstExists && socialMatches.telegram.first < 10) {
              socialMatches.telegram.first.push(firstSocial.post);
            }
            if (!secondExists && socialMatches.telegram.second < 10) {
              socialMatches.telegram.second.push(secondSocial.post);
            }
          }
        }

        if (firstSocial.socials.twitter && firstSocial.socials.twitter === secondSocial.socials.twitter) {
          if (!socialMatches.twitter) {
            socialMatches.twitter = {
              name: firstSocial.socials.twitter,
              first: [firstSocial.post],
              second: [secondSocial.post]
            };
          } else {
            const firstExists = socialMatches.twitter.first.find(first => first.post_id === firstSocial.post.post_id);
            const secondExists = socialMatches.twitter.second.find(
              second => second.post_id === secondSocial.post.post_id
            );

            if (!firstExists && socialMatches.twitter.first < 10) {
              socialMatches.twitter.first.push(firstSocial.post);
            }
            if (!secondExists && socialMatches.twitter.second < 10) {
              socialMatches.twitter.second.push(secondSocial.post);
            }
          }
        }

        if (firstSocial.socials.facebook && firstSocial.socials.facebook === secondSocial.socials.facebook) {
          if (!socialMatches.facebook) {
            socialMatches.facebook = {
              name: firstSocial.socials.facebook,
              first: [firstSocial.post],
              second: [secondSocial.post]
            };
          } else {
            const firstExists = socialMatches.facebook.first.find(first => first.post_id === firstSocial.post.post_id);
            const secondExists = socialMatches.facebook.second.find(
              second => second.post_id === secondSocial.post.post_id
            );

            if (!firstExists && socialMatches.facebook.first < 10) {
              socialMatches.facebook.first.push(firstSocial.post);
            }
            if (!secondExists && socialMatches.facebook.second < 10) {
              socialMatches.facebook.second.push(secondSocial.post);
            }
          }
        }
      });
    });

    const socialsPostsOrganize = socialsArray => {
      const resultsObject = {};

      socialsArray.forEach(occurrence => {
        Object.keys(occurrence.socials).forEach(socialType => {
          if (!occurrence.socials[socialType]) return;

          if (!resultsObject[socialType]) {
            resultsObject[socialType] = [];
          }

          const socialIndex = resultsObject[socialType].findIndex(
            s => s.name.toLowerCase() === occurrence.socials[socialType].toLowerCase()
          );

          if (socialIndex === -1) {
            resultsObject[socialType].push({
              name: occurrence.socials[socialType],
              posts: [occurrence.post]
            });
            return;
          }

          const postIndex = resultsObject[socialType][socialIndex].posts.findIndex(
            p => p.post_id === occurrence.post.post_id
          );

          if (postIndex === -1) {
            resultsObject[socialType][socialIndex].posts.push(occurrence.post);
          }
        });
      });

      return resultsObject;
    };

    const firstSocialsPosts = socialsPostsOrganize(firstSocials);
    const secondSocialsPosts = socialsPostsOrganize(secondSocials);

    // const secondTelegram = secondSocials.reduce((prev, curr) => {
    //   if (!curr) return prev;
    //   Object.keys(curr.socials).map(social => {
    //     if (!curr.socials[social]) return prev;
    //     const existIndex = prev.findIndex(
    //       p => p[social]?.name === curr.socials[social],
    //     );

    //     if (existIndex === -1) {
    //       if (!prev[social]) {
    //         prev[social] = {};
    //       }
    //       prev[social].push({ name: curr.socials[social], posts: [curr.post] });
    //       return prev;
    //     }

    //     prev[social][existIndex].posts.push(curr.post);
    //     return prev;
    //   });
    //   return prev;
    // }, []);

    //

    const data = {
      addresses: addressesMatches,
      socials: socialMatches,
      all_socials: {
        first: firstSocialsPosts,
        second: secondSocialsPosts
      }
    };

    return data;
  }
}

export default CompareUsersService;
