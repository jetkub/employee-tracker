// import inquirer, mysql2
const inquirer = require("inquirer");
const mysql = require("mysql2");
const table = require("./helpers/table");
// require dotenv so we can hide our database credentials
require("dotenv").config();

// connect to database
const db = mysql.createConnection(
  {
    host: "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  console.log(`Connected to the ${process.env.DB_NAME} database.`)
);

// prompt user for what they would like to do with inquirer
const init = () => {
  inquirer
    .prompt({
      name: "action",
      type: "list",
      message: "Please make a selection:",
      choices: [
        "View departments",
        "View roles",
        "View employees",
        "View total utilized budget of a department",
        "Add department",
        "Add role",
        "Add employee",
        "Update employee role",
        "View employees by manager",
        "View employees by department",
        "Delete department",
        "Delete role",
        "Delete employee",
        "Exit",
      ],
    })
    .then((answer) => {
      switch (answer.action) {
        case "View departments":
          viewDepartments();
          break;

        case "View roles":
          viewRoles();
          break;

        case "View employees":
          viewEmployees();
          break;

        case "View total utilized budget of a department":
          viewBudget();
          break;

        case "Add department":
          addDepartment();
          break;

        case "Add role":
          addRole();
          break;

        case "Add employee":
          addEmployee();
          break;

        case "Update employee role":
          updateEmployeeRole();
          break;

        case "View employees by manager":
          viewEmployeesByManager();
          break;

        case "View employees by department":
          viewEmployeesByDepartment();
          break;

        case "Delete department":
          deleteDepartment();
          break;

        case "Delete role":
          deleteRole();
          break;

        case "Delete employee":
          deleteEmployee();
          break;

        case "Exit":
          db.end();
          break;

        default:
          console.log(`Unsupported action: ${answer.action}`);
          break;
      }
    });
};

// add functions to perform database queries that are called by the inquirer prompts
// view departments as table with Department ID and Department Name
const viewDepartments = () => {
  db.query(
    `SELECT department.id AS "Department ID", department.name AS "Department Name" FROM department`,
    (err, rows) => {
      if (err) {
        console.log(err);
      }
      table(rows);
      init();
    }
  );
};

// view roles as a table with Title, Role ID, Department, and Salary
const viewRoles = () => {
  db.query(
    `SELECT role.id AS "Role ID", role.title AS "Job Title", department.name AS "Department", role.salary AS "Salary"
    FROM role
    LEFT JOIN department ON role.department_id = department.id`,
    (err, rows) => {
      if (err) {
        console.log(err);
      }
      table(rows);
      init();
    }
  );
};

// view employees as a table with Title, First Name, Last Name, Department, Salary, and Manager; sort by department
const viewEmployees = () => {
  db.query(
    `SELECT employee.id AS "Employee ID", employee.first_name AS "First Name", employee.last_name AS "Last Name", role.title AS "Job Title", department.name AS Department, role.salary AS "Salary", CONCAT(manager.first_name, ' ', manager.last_name) AS Manager
    FROM employee
    LEFT JOIN role ON employee.role_id = role.id
    LEFT JOIN department ON role.department_id = department.id
    LEFT JOIN employee manager ON manager.id = employee.manager_id
    ORDER BY department.id`,
    (err, rows) => {
      if (err) {
        console.log(err);
      }
      table(rows);
      init();
    }
  );
};

// add department
const addDepartment = () => {
  inquirer
    .prompt({
      name: "department",
      type: "input",
      message: "Please enter the name of the department you would like to add:",
    })
    .then((answer) => {
      let newDepartment = answer.department;
      db.query(
        `INSERT INTO department (name) VALUES (?)`,
        newDepartment,
        (err) => {
          if (err) {
            console.log(err);
          }
          console.log(`Added ${answer.department} department to the database.`);
          init();
        }
      );
    });
};

// add role
const addRole = () => {
  inquirer
    .prompt([
      {
        name: "title",
        type: "input",
        message: "Please enter the title of the role you would like to add:",
      },
      {
        name: "salary",
        type: "input",
        message: "Please enter the salary of the role you would like to add:",
      },
    ])
    .then((answer) => {
      // save answers to role object
      const role = {
        title: answer.title,
        salary: answer.salary,
      };
      // query the database for the department names
      db.query(`SELECT name FROM department`, (err, rows) => {
        if (err) {
          console.log(err);
        }
        // create an array of department names
        const departmentNames = rows.map((row) => row.name);
        // prompt the user to select a department from the list of department names queried from the database
        inquirer
          .prompt({
            name: "department",
            type: "list",
            message: "Please select the department for this role:",
            choices: departmentNames,
          })
          .then((answer) => {
            // query the database for the department id based on the department name and then insert the role into the database
            db.query(
              `SELECT id FROM department WHERE name = '${answer.department}'`,
              (err, rows) => {
                if (err) {
                  console.log(err);
                }
                // set the role object id to the id of the department
                role.id = rows[0].id;
                // insert the role into the database with the correct department id for that role from the previous query
                db.query(
                  `INSERT INTO role (title, salary, department_id) VALUES (?, ?, ?)`,
                  [role.title, role.salary, role.id],
                  (err) => {
                    if (err) {
                      console.log(err);
                    }
                    console.log(
                      `Added ${role.title} role to the ${answer.department} department in the database.`
                    );
                    init();
                  }
                );
              }
            );
          });
      });
    });
};

// WHEN I choose to add an employee
// THEN I am prompted to enter the employee’s first name, last name, role, and manager,
// and that employee is added to the database

// add employee
const addEmployee = () => {
  // prompt user for first and last name
  inquirer
    .prompt([
      {
        name: "firstName",
        type: "input",
        message: "Please enter the employee's first name:",
      },
      {
        name: "lastName",
        type: "input",
        message: "Please enter the employee's last name:",
      },
    ])
    .then((answer) => {
      // save the first and last name to employee object
      const employee = {
        firstName: answer.firstName,
        lastName: answer.lastName,
      };
      // query the database for a list of roles
      db.query("SELECT * FROM role", (err, rows) => {
        if (err) {
          console.log(err);
        }
        // create an array of role titles
        var roleTitles = [];
        rows.forEach((row) => {
          roleTitles.push(row.title);
        });
        // prompt user to select a role from a list
        inquirer
          .prompt({
            name: "role",
            type: "list",
            message: "Please select the employee's role:",
            choices: roleTitles,
          })
          .then((answer) => {
            // add the role to the employee object
            employee.role = answer.role;
            // join database tables to get all employees that are managers
            db.query(
              `SELECT employee.id, employee.first_name, employee.last_name, role.title 
              FROM employee LEFT JOIN role ON employee.role_id = role.id 
              WHERE role.title LIKE '%Manager%'`,
              (err, rows) => {
                if (err) {
                  console.log(err);
                }
                // create an array of manager names
                var managerNames = [];
                rows.forEach((row) => {
                  managerNames.push(`${row.first_name} ${row.last_name}`);
                });
                // add No Manager option to the list
                managerNames.push("No Manager");
                // prompt user to select a manager from a list
                inquirer
                  .prompt({
                    name: "manager",
                    type: "list",
                    message: "Please select the employee's manager:",
                    choices: managerNames,
                  })
                  .then((answer) => {
                    // if No Manager is selected, set the manager to null
                    if (answer.manager === "No Manager") {
                      answer.manager = null;
                    }
                    // add the manager to the employee object
                    employee.manager = answer.manager;
                    // add employee to the database with a prepared statement with employee object values as parameters
                    db.query(
                      `INSERT INTO employee (first_name, last_name, role_id, manager_id) 
                      VALUES (?, ?, 
                        (SELECT id FROM role WHERE title = ?),
                        (SELECT id FROM (
                          (SELECT id FROM employee WHERE CONCAT(first_name, ' ', last_name) = ?)
                        ) AS temp)
                      )`, // this is a nested query to get the id of the manager based on the manager name
                      // needed to do this to solve a bug where the manager id was not being inserted correctly
                      // because of a MySQL 1093 error, see:
                      // https://stackoverflow.com/a/9843719/9367208
                      [
                        employee.firstName,
                        employee.lastName,
                        employee.role,
                        employee.manager,
                      ],
                      (err) => {
                        if (err) {
                          console.log(err);
                        }
                        if (employee.manager === null) {
                          const message = `Added ${employee.firstName} ${employee.lastName} to the database as a ${employee.role}.`;
                          console.log(message);
                        } else {
                          const message = `Added ${employee.firstName} ${employee.lastName} to the database as a ${employee.role} reporting to ${employee.manager}.`;
                          console.log(message);
                        }
                        init();
                      }
                    );
                  });
              }
            );
          });
      });
    });
};

// update employee role function
updateEmployeeRole = () => {
  // query the database for a list of employees and their roles
  db.query(
    `SELECT employee.id, employee.first_name, employee.last_name, role.title
    FROM employee LEFT JOIN role ON employee.role_id = role.id`,
    (err, rows) => {
      if (err) {
        console.log(err);
      }
      // create an array of employee names and roles
      var employeeNamesAndRoles = [];
      rows.forEach((row) => {
        employeeNamesAndRoles.push(
          `${row.first_name} ${row.last_name} - ${row.title}`
        );
      });
      // prompt user to select an employee and role from a list
      inquirer
        .prompt({
          name: "employeeNameAndRole",
          type: "list",
          message: "Please select the employee to update:",
          choices: employeeNamesAndRoles,
        })
        // split the employee name and role
        .then((answer) => {
          const employeeNameAndRole = answer.employeeNameAndRole.split(" - ");
          // add the employee name and role to the employee object
          const employee = {
            name: employeeNameAndRole[0],
            oldRole: employeeNameAndRole[1],
          };
          // query the database for a list of roles
          db.query("SELECT * FROM role", (err, rows) => {
            if (err) {
              console.log(err);
            }
            // create an array of role titles
            var roleTitles = [];
            rows.forEach((row) => {
              roleTitles.push(row.title);
            });
            // prompt user to select a role from a list
            inquirer
              .prompt({
                name: "newRole",
                type: "list",
                message: "Please select the employee's new role:",
                choices: roleTitles,
              })
              .then((answer) => {
                // add the new role to the employee object
                employee.newRole = answer.newRole;
                // update the employee's role in the database with a prepared statement with employee object values as parameters
                db.query(
                  `UPDATE employee SET role_id = (SELECT id FROM role WHERE title = ?) WHERE CONCAT(first_name, ' ', last_name) = ?`,
                  [employee.newRole, employee.name],
                  (err) => {
                    if (err) {
                      console.log(err);
                    }
                    console.log(
                      `Updated ${employee.name}'s role from ${employee.oldRole} to ${employee.newRole}.`
                    );
                    init();
                  }
                );
              });
          });
        });
    }
  );
};

// view employees by manager
viewEmployeesByManager = () => {
  // query the database for a list of managers
  db.query(
    `SELECT employee.id, employee.first_name, employee.last_name, role.title 
    FROM employee LEFT JOIN role ON employee.role_id = role.id
    WHERE role.title LIKE '%Manager%'`,
    (err, rows) => {
      if (err) {
        console.log(err);
      }
      // create an array of manager names
      var managerNames = [];
      rows.forEach((row) => {
        managerNames.push(`${row.first_name} ${row.last_name}`);
      });
      // prompt user to select a manager from a list
      inquirer
        .prompt({
          name: "managerName",
          type: "list",
          message: "Please select a manager to view their employees:",
          choices: managerNames,
        })
        .then((answer) => {
          // query the database for a list of employees under the selected manager
          db.query(
            `SELECT employee.id AS "Employee ID", employee.first_name AS "First Name", employee.last_name AS "Last Name", role.title AS "Job Title", department.name AS Department, role.salary AS "Salary", CONCAT(manager.first_name, ' ', manager.last_name) AS Manager
            FROM employee LEFT JOIN role ON employee.role_id = role.id LEFT JOIN department ON role.department_id = department.id LEFT JOIN employee manager ON employee.manager_id = manager.id
            WHERE CONCAT(manager.first_name, ' ', manager.last_name) = ?`,
            [answer.managerName],
            (err, rows) => {
              if (err) {
                console.log(err);
              }
              // display the list of employees under the selected manager
              table(rows);
              init();
            }
          );
        });
    }
  );
};

// view employees by department
viewEmployeesByDepartment = () => {
  // query the database for a list of departments
  db.query("SELECT * FROM department", (err, rows) => {
    if (err) {
      console.log(err);
    }
    // create an array of department names
    var departmentNames = [];
    rows.forEach((row) => {
      departmentNames.push(row.name);
    });
    // prompt user to select a department from a list
    inquirer
      .prompt({
        name: "departmentName",
        type: "list",
        message: "Please select a department to view its employees:",
        choices: departmentNames,
      })
      .then((answer) => {
        // query the database for a list of employees in the selected department
        db.query(
          `SELECT employee.id AS "Employee ID", employee.first_name AS "First Name", employee.last_name AS "Last Name", role.title AS "Job Title", department.name AS Department, role.salary AS "Salary", CONCAT(manager.first_name, ' ', manager.last_name) AS Manager
          FROM employee LEFT JOIN role ON employee.role_id = role.id LEFT JOIN department ON role.department_id = department.id LEFT JOIN employee manager ON employee.manager_id = manager.id
          WHERE department.name = ?`,
          [answer.departmentName],
          (err, rows) => {
            if (err) {
              console.log(err);
            }
            // display the list of employees in the selected department
            table(rows);
            init();
          }
        );
      });
  });
};

// delete a department
const deleteDepartment = () => {
  // query the database for a list of departments
  db.query("SELECT * FROM department", (err, rows) => {
    if (err) {
      console.log(err);
    }
    // create an array of department names
    var departmentNames = [];
    rows.forEach((row) => {
      departmentNames.push(row.name);
    });
    // prompt user to select a department from a list
    inquirer
      .prompt({
        name: "departmentName",
        type: "list",
        message: "Please select a department to delete:",
        choices: departmentNames,
      })
      .then((answer) => {
        // delete the selected department from the database with a prepared statement with the department name as a parameter
        db.query(
          "DELETE FROM department WHERE name = ?",
          [answer.departmentName],
          (err) => {
            if (err) {
              console.log(err);
            }
            console.log(`Deleted ${answer.departmentName} department.`);
            init();
          }
        );
      });
  });
};

// delete a role
const deleteRole = () => {
  // query the database for a list of roles
  db.query("SELECT * FROM role", (err, rows) => {
    if (err) {
      console.log(err);
    }
    // create an array of role titles
    var roleTitles = [];
    rows.forEach((row) => {
      roleTitles.push(row.title);
    });
    // prompt user to select a role from a list
    inquirer
      .prompt({
        name: "roleTitle",
        type: "list",
        message: "Please select a role to delete:",
        choices: roleTitles,
      })
      .then((answer) => {
        // delete the selected role from the database with a prepared statement with the role title as a parameter
        db.query(
          "DELETE FROM role WHERE title = ?",
          [answer.roleTitle],
          (err) => {
            if (err) {
              console.log(err);
            }
            console.log(`Deleted ${answer.roleTitle} role.`);
            init();
          }
        );
      });
  });
};

// delete an employee
const deleteEmployee = () => {
  // query the database for a list of employees
  db.query("SELECT * FROM employee", (err, rows) => {
    if (err) {
      console.log(err);
    }
    // create an array of employee names
    var employeeNames = [];
    rows.forEach((row) => {
      employeeNames.push(`${row.first_name} ${row.last_name}`);
    });
    // prompt user to select an employee from a list
    inquirer
      .prompt({
        name: "employeeName",
        type: "list",
        message: "Please select an employee to delete:",
        choices: employeeNames,
      })
      .then((answer) => {
        // delete the selected employee from the database with a prepared statement with the employee name as a parameter
        db.query(
          "DELETE FROM employee WHERE CONCAT(first_name, ' ', last_name) = ?",
          [answer.employeeName],
          (err) => {
            if (err) {
              console.log(err);
            }
            console.log(`Deleted ${answer.employeeName} employee.`);
            init();
          }
        );
      });
  });
};

// view total utilized budget of a department
const viewBudget = () => {
  // query the database for a list of departments
  db.query("SELECT * FROM department", (err, rows) => {
    if (err) {
      console.log(err);
    }
    // create an array of department names
    var departmentNames = [];
    rows.forEach((row) => {
      departmentNames.push(row.name);
    });
    // prompt user to select a department from a list
    inquirer
      .prompt({
        name: "departmentName",
        type: "list",
        message:
          "Please select a department to view its total utilized budget:",
        choices: departmentNames,
      })
      .then((answer) => {
        // query the database for the total utilized budget of the selected department
        db.query(
          `SELECT department.name AS Department, SUM(role.salary) AS "Total Utilized Budget"
          FROM employee LEFT JOIN role ON employee.role_id = role.id LEFT JOIN department ON role.department_id = department.id
          WHERE department.name = ?`,
          [answer.departmentName],
          (err, rows) => {
            if (err) {
              console.log(err);
            }
            // display the total utilized budget of the selected department
            table(rows);
            init();
          }
        );
      });
  });
};

// start the application
init();
