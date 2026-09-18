import { RecycleBin } from "../models/RecycleBin.js";

/**
 * Helper to soft delete a document by moving it to the Recycle Bin.
 * @param {Object} model - The Mongoose model of the document
 * @param {String} id - The ID of the document to delete
 * @param {String} collectionName - The name of the collection (e.g. 'Registration', 'CafeteriaTransaction')
 * @param {String} userId - The ID of the user performing the deletion (optional)
 * @returns {Boolean} true if successful, throws error otherwise
 */
export const moveToRecycleBin = async (model, id, collectionName, userId) => {
  const doc = await model.findById(id).lean();
  if (!doc) {
    throw new Error(`${collectionName} record not found`);
  }

  // Calculate expiration date (5 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 5);

  await RecycleBin.create({
    originalCollection: collectionName,
    originalId: doc._id,
    data: doc,
    deletedBy: userId || null,
    deletedAt: new Date(),
    expiresAt,
  });

  await model.findByIdAndDelete(id);
  return true;
};
