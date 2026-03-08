const { Op } = require('sequelize');
const { Language, sequelize, Sequelize, Language_translation } = require("../../../models");
const { translateText } = require('../common/translate.service');
const path = require('path');
const fs = require('fs');

async function createLanguage(languagePayload) {
    try {
        const newLanguage = await Language.create(languagePayload);
        return newLanguage;
    } catch (error) {
        console.error('Error creating Language:', error);
        throw error;
    }
}

async function getLanguages(filter = {}, pagination = { page: 1, pageSize: 10 }, order = [['createdAt', 'DESC']]) {
    try {
        const { page = 1, pageSize = 10 } = pagination;
        const offset = (Number(page) - 1) * Number(pageSize);
        const limit = Number(pageSize);

        const query = {
            where: filter,
            limit,
            offset,
            order,
        };

        const { rows, count } = await Language.findAndCountAll(query);

        return {
            Records: rows,
            Pagination: {
                total_pages: Math.ceil(count / pageSize),
                total_records: Number(count),
                current_page: Number(page),
                records_per_page: Number(pageSize),
            },
        };
    } catch (error) {
        console.error('Error fetching Language:', error);
        throw error;
    }
}

async function updateLanguage(filter, updateData) {
    try {
if ("default_status" in updateData) {

        if (updateData?.default_status == true) {
          await Language.update(
            { default_status: false },
            { where: { language_id: { [Op.notIn]: [] } } }
          );
        } else if (updateData?.default_status == false) {
          const data = await Language.findAll();
          await Language.update(
            { default_status: true },
            {
              where: {
                language_id: { [Op.notIn]: [filter.language_id] },
              },
            }
          );
        }
      }
        const [updatedCount, row] = await Language.update(updateData, { where: filter, returning: true });
        return {
            message: updatedCount > 0 ? 'Update successful' : 'No records updated',
            updated_count: updatedCount,
            row
        };
    } catch (error) {
        console.error('Error updating Language:', error);
        throw error;
    }
}

async function createLanguageTranslation(language_payload) {
    const queryInterface = sequelize.getQueryInterface();

    try {
        const tableDescription = await queryInterface.describeTable(
            "Language_translations"
        );
        if (!tableDescription[language_payload.language]) {
            // If column does not exist
            // Add the new column
            await queryInterface.addColumn("Language_translations", language_payload.language, {
                type: Sequelize.STRING,
                allowNull: true,
            });

            // Update the newly added column with values from the 'key' column
            await queryInterface.sequelize.query(`
                UPDATE "Language_translations"
                SET "${language_payload.language}" = "key"
              `);



        } else {
        }
    } catch (error) {
        console.error('Error creating Language Translation:', error);
        throw error;
    }
}

async function getKeywords(filterPayload, pagination = { page: 1, pageSize: 10 }) {
    try {
        const results = await sequelize.query(
            `SELECT "key_id", "key", "${filterPayload.language}" 
             FROM "Language_translations"`,
            {
                type: sequelize.QueryTypes.SELECT,
            }
        );

        const formattedResults = results.map((row) => ({
            key_id: row.key_id,
            key: row.key,
            Translation: row[filterPayload.language],
        }));

        return {
            Records: formattedResults,
        };
    } catch (error) {
        console.error('Error fetching Language Keywords:', error);
        throw error;
    }
}

async function getLanguageTranslation(terget_language) {
    try {
        const results = await sequelize.query(
            `SELECT key_id, "key" FROM "Language_translations"`,
            {
                type: sequelize.QueryTypes.SELECT,
            }
        );

        const jsonData = results.reduce((acc, row) => {
            acc[row.key_id] = row.key; // setting_id as key, 'key' value to be translated
            return acc;
        }, {});
        const requestData = {
            json_data: jsonData,
            target_language: terget_language,
        };
        const res = await translateText(requestData)
        // console.log("res",res);
        return res
    } catch (error) {
        console.error('Error fetching Language Translation:', error);
        throw error;

    }
}

async function createKeyword(keywordPayload) {
  try {
    // Check if keyword already exists
    const existingKeyword = await Language_translation.findOne({
      where: { key: keywordPayload.key },
    });

    if (existingKeyword) {
      return {
        success: false,
        message: `Keyword "${keywordPayload.key}" already exists`,
        record: existingKeyword,
      };
    }

    const queryInterface = sequelize.getQueryInterface();

    // get all columns of Language_translations
    const tableDescription = await queryInterface.describeTable("Language_translations");

    // prepare payload
    const insertPayload = { ...keywordPayload };

    // fill each language column with the key itself if not provided
    for (const column of Object.keys(tableDescription)) {
      if (
        column !== "key_id" &&
        column !== "key" &&
        column !== "createdAt" &&
        column !== "updatedAt" &&
        !insertPayload[column]
      ) {
        insertPayload[column] = keywordPayload.key; // fallback: use key as value
      }
    }

    // insert
    const newKeyword = await Language_translation.create(insertPayload);
    return {
      success: true,
      message: "Keyword added successfully",
      record: newKeyword,
    };
  } catch (error) {
    console.error("Error creating Keyword:", error);
    throw error;
  }
}

const addDefaultEntries = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();

    // Get existing table structure
    let tableDescription = await queryInterface.describeTable("Language_translations");

    // ✅ Step 1: Get all languages from Language table
    const allLanguages = await Language.findAll({ attributes: ["language"] });

    // ✅ Step 2: Read and parse the JSON file
    const filePath = path.join(__dirname, "..", "..", "default_keywords.json");
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // ✅ Step 3: Ensure every language column exists
    for (const langObj of allLanguages) {
      const lang = langObj.language;

      if (tableDescription[lang] === undefined) {

        await queryInterface.addColumn("Language_translations", lang, {
          type: Sequelize.STRING,
          allowNull: true,
        });

        // ⚡ Backfill the new column for existing rows
        await sequelize.query(
          `UPDATE "Language_translations" SET "${lang}" = "key" WHERE "${lang}" IS NULL;`
        );
      }
    }

    // Refresh table description (since we might have added new columns)
    tableDescription = await queryInterface.describeTable("Language_translations");

    // ✅ Step 4: Insert missing keys (and auto-fill all language columns)
    for (const entry of jsonData) {
      await createKeyword(entry);
    }

    console.log("✅ Default entries, language columns, and backfill completed");
  } catch (error) {
    console.error("Error adding default entries:", error);
  }
};

module.exports = {
    createLanguage,
    getLanguages,
    updateLanguage,
    createLanguageTranslation,
    getLanguageTranslation,
    getKeywords,
    createKeyword,
    addDefaultEntries
};