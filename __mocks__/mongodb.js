// Mock MongoDB for tests
const mockCollection = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  createIndex: jest.fn(),
};

const mockDb = {
  collection: jest.fn(() => mockCollection),
  listCollections: jest.fn(() => ({ toArray: jest.fn(() => []) })),
  createCollection: jest.fn(),
  command: jest.fn(),
};

const mockClient = {
  connect: jest.fn(() => Promise.resolve()),
  db: jest.fn(() => mockDb),
  close: jest.fn(),
};

const MongoClient = {
  connect: jest.fn(() => Promise.resolve(mockClient)),
};

module.exports = {
  MongoClient,
  ObjectId: jest.fn((id) => ({ toString: () => id || '507f1f77bcf86cd799439011' })),
};