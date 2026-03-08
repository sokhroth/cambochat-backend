module.exports = (sequelize, DataTypes) => {
    const Report_type = sequelize.define("Report_type", {
        report_type_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        report_text: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ""
        },
        report_for: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ""
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }

    })

    Report_type.associate = function (models) {
        Report_type.hasMany(models.Report, {
            foreignKey: "report_type_id",
            defaultValue: 0,
            onDelete: 'CASCADE'

        })

    }

    return Report_type
}