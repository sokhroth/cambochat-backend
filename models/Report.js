module.exports = (sequelize, DataTypes) => {
    const Report = sequelize.define("Report", {
        report_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        report_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        report_text: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    })

    Report.associate = function (models) {
        Report.belongsTo(models.User, {
            foreignKey: "report_by",
            as: "reporter",
            onDelete: "CASCADE",
        });

        Report.belongsTo(models.User, {
            foreignKey: "report_to_user",
            as: "reported_user",
            onDelete: "CASCADE",
        });
        Report.belongsTo(models.Chat, {
          foreignKey: "report_to_group",
          as: "reported_group",
          onDelete: "CASCADE",
        });
        Report.belongsTo(models.Report_type, {
            foreignKey: "report_type_id",
            defaultValue: 0,
            onDelete: 'CASCADE'
        })
    }

    return Report
}