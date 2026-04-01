import { faker } from '@faker-js/faker';

export const randomNum = (min = 0, max = 1000) => {
    return faker.number.int({ min, max });
};
