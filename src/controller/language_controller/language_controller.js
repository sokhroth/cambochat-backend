const { sequelize } = require("../../../models");
const { generalResponse } = require("../../helper/response.helper");
const updateFieldsFilter = require("../../helper/updateField.helper");
const {
  getWordTranslation,
} = require("../../service/common/translate.service");
const {
  createLanguage,
  getLanguages,
  updateLanguage,
  createLanguageTranslation,
  getLanguageTranslation,
  getKeywords,
  createKeyword,
} = require("../../service/repository/Language.service");

// Add a new language
async function add_new_language(req, res) {
  try {
    const allowedFields = ["language", "language_alignment", "country"];
    let filteredData;
    try {
      // Only allow certain fields from request body
      filteredData = updateFieldsFilter(req.body, allowedFields, true);
    } catch (err) {
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // Create a new language record
    const newLanguage = await createLanguage(filteredData);

    // Initialize translations for this new language
    const newlanguagetranslation = await createLanguageTranslation({
      language: newLanguage.language,
    });

    // Return success response
    return generalResponse(
      res,
      newLanguage,
      "Language Created Successfully",
      true,
      false
    );
  } catch (error) {
    console.error("Error in adding new language", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while creating new language!",
      false,
      true
    );
  }
}

// Get list of languages with pagination/filter
async function listLanguage(req, res) {
  try {
    const { page = 1, pageSize = 10 } = req.body;
    const allowedFields = [
      "language",
      "language_alignment",
      "country",
      "status",
    ];
    let filteredData;
    try {
      // Filter request body for valid fields
      filteredData = updateFieldsFilter(req.body, allowedFields);
    } catch (err) {
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // Fetch languages with filters and pagination
    const avatars = await getLanguages(filteredData, { page, pageSize });

    return generalResponse(res, avatars, "Languages Found", true, false);
  } catch (error) {
    console.error("Error in finding Languages", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while finding Languages!",
      false,
      true
    );
  }
}

// Get list of language keywords with pagination/filter
async function listLanguageKeywords(req, res) {
  try {
    const { page = 1, pageSize = 10 } = req.body;
    const allowedFields = ["key"];

    // language_id is mandatory
    if (!req.body.language_id) {
      return generalResponse(
        res,
        { success: false },
        "language_id is required",
        false,
        true
      );
    }

    let filteredData;
    try {
      filteredData = updateFieldsFilter(req.body, allowedFields);
    } catch (err) {
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // Get language details by ID
    const language = await getLanguages({ language_id: req.body.language_id });

    // Attach the actual language code to the filter
    filteredData.language = language.Records[0].language;

    // Fetch keywords for this language
    const words = await getKeywords(filteredData, { page, pageSize });

    return generalResponse(res, words, "Languages Found", true, false);
  } catch (error) {
    console.error("Error in finding Languages", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while finding Languages!",
      false,
      true
    );
  }
}

// Update language details
async function update_Language(req, res) {
  try {
    const allowedFields = [
      "language_alignment",
      "country",
      "status",
      "default_status",
    ];
    let filteredData;
    try {
      filteredData = updateFieldsFilter(req.body, allowedFields);
    } catch (err) {
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // language_id is required for update
    if (!req.body.language_id) {
      return generalResponse(
        res,
        { success: false },
        "language_id is required",
        false,
        true
      );
    }

    // If this language is set as default, reset all others first
    if (filteredData.default_status == "true") {
      await updateLanguage({ default_status: true }, { default_status: false });
    }

    // Update language record
    const updated = await updateLanguage(
      { language_id: req.body.language_id },
      filteredData
    );

    return generalResponse(res, updated, "Language Updated", true, false);
  } catch (error) {
    console.error("Error in updating Language", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while updating Language!",
      false,
      true
    );
  }
}

// Translate all keywords for a given language
async function translate_all_keywords(req, res) {
  try {
    const allowedFields = ["language_id"];
    let filteredData;
    try {
      filteredData = updateFieldsFilter(req.body, allowedFields, true);
    } catch (err) {
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // Validate language existence
    const language = await getLanguages({
      language_id: filteredData.language_id,
    });
    if (language.Records.length == 0) {
      return generalResponse(
        res,
        { success: false },
        "Language not found",
        false,
        true
      );
    }

    // Fetch all translations for this language
    const translation_res = await getLanguageTranslation(
      language.Records[0].language
    );

    // Update each keyword translation in DB
    for (const setting_id in translation_res) {
      const translatedValue = translation_res[setting_id];

      await sequelize.query(
        `UPDATE "Language_translations" SET "${language.Records[0].language}" = :translatedValue WHERE "key_id" = :setting_id`,
        {
          replacements: { translatedValue, setting_id },
          type: sequelize.QueryTypes.UPDATE,
        }
      );
    }

    return generalResponse(
      res,
      translation_res,
      "Language Translated",
      true,
      false
    );
  } catch (error) {
    console.error("Error in updating Language", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while updating Language!",
      false,
      true
    );
  }
}

// Translate a single keyword for a given language
async function translate_single_keywords(req, res) {
  try {
    const allowedFields = ["language_id", "key_id", "key"];
    let filteredData;
    try {
      filteredData = updateFieldsFilter(req.body, allowedFields, true);
    } catch (err) {
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // Validate language existence
    const language = await getLanguages({
      language_id: filteredData.language_id,
    });
    if (language.Records.length == 0) {
      return generalResponse(
        res,
        { success: false },
        "Language not found",
        false,
        true
      );
    }

    // Translate single word
    const translation_res = await getWordTranslation(
      language.Records[0].language,
      filteredData.key,
      filteredData.key_id
    );

    // Extract translated value for the key
    const translatedValue = translation_res[filteredData.key_id];

    // Update DB record for this keyword
    const updateResult = await sequelize.query(
      `UPDATE "Language_translations" SET "${language.Records[0].language}" = :translatedValue WHERE "key_id" = :key_id`,
      {
        replacements: { translatedValue, key_id: filteredData.key_id },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    return generalResponse(
      res,
      translation_res,
      "Language Translated",
      true,
      false
    );
  } catch (error) {
    console.error("Error in updating Language", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while updating Language!",
      false,
      true
    );
  }
}

async function manual_edit_keyword(req, res) {
  try {
    const allowedFields = ["language_id", "key_id", "key"];
    let filteredData;
    try {
      filteredData = updateFieldsFilter(req.body, allowedFields, true);
    } catch (err) {
      return generalResponse(res, { success: false }, err.message, false, true);
    }

    // Validate language existence
    const language = await getLanguages({
      language_id: filteredData.language_id,
    });
    if (language.Records.length == 0) {
      return generalResponse(
        res,
        { success: false },
        "Language not found",
        false,
        true
      );
    }

    // Translate single word
    // const translation_res = await getWordTranslation(
    //   language.Records[0].language,
    //   filteredData.key,
    //   filteredData.key_id
    // );

    // Extract translated value for the key
    const translatedValue = filteredData.key

    // Update DB record for this keyword
    const updateResult = await sequelize.query(
      `UPDATE "Language_translations" SET "${language.Records[0].language}" = :translatedValue WHERE "key_id" = :key_id`,
      {
        replacements: { translatedValue, key_id: filteredData.key_id },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    return generalResponse(
      res,
      translation_res,
      "Language Translated",
      true,
      false
    );
  } catch (error) {
    console.error("Error in updating Language", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while updating Language!",
      false,
      true
    );
  }
}
// Add new keyword
async function add_new_keyword(req, res) {
  try {
    const allowedFields = ["key"];
    let filteredData;
    try {
      filteredData = updateFieldsFilter(req.body, allowedFields, true);
    } catch (err) {
      return generalResponse(res, { success: false }, err.message, false, true);
    }
    // Add new keyword
    const newKeyword = await createKeyword(filteredData);

    return generalResponse(res, newKeyword, "Keyword Added", true, false);
  } catch (error) {
    console.error("Error in adding new keyword", error);
    return generalResponse(
      res,
      { success: false },
      "Something went wrong while adding new keyword!",
      false,
      true
    );
  }
}

module.exports = {
  add_new_language,
  listLanguage,
  update_Language,
  translate_all_keywords,
  translate_single_keywords,
  listLanguageKeywords,
  add_new_keyword,
  manual_edit_keyword
  
};
