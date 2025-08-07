// Mock database functions for tests
export const getDatabase = jest.fn(() => Promise.resolve({
  collection: jest.fn(() => ({
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
  }))
}));