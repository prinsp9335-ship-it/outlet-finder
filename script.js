const API_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnTJbu5CBmExjPP59BFK3e33wnTvR57ZeiYFuaTBadQIw8pwVyJTP0UiE3PFsQfuWC9dXV6eVAzB1R6bxaJis8wWGqMCGJ_226OTlD-0O_EIGnNscs_AyIYvhKVmuHwSyb2yVm1fLNBMf-NtLQTzt_gJua_w1XYpOIApI0QhPPYHrAd6jOPsT1XLecvKtnB6MX_QagCOOkCh_SLOJnOeIVGJhJUIrkzZIpk0RMxDId_rEZ7sjTuiZJ1caVMNUt972ZKiAxAAIkLspWJfN47nVAcrbGeleg&lib=MbmrrydUixTTNWuBsFTpgub44--FANL0h";
let allData = [];
let filteredData = [];

// Number convert function
function num(value) {
    if (value === null || value === undefined || value === "") return 0;

    return Number(
        String(value)
            .replace(/₹/g, "")
            .replace(/,/g, "")
    ) || 0;
}

// Date format
function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN");
}

// HTML safe
function safe(value) {
    return value === null || value === undefined ? "" : value;
}


// ================= LOAD DATA =================

async function loadData() {

    const tableBody = document.getElementById("tableBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="19" class="loading">
                Loading Data...
            </td>
        </tr>
    `;

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("API Error: " + response.status);
        }

        const data = await response.json();

        allData = data;

        // User filter fill
        loadUsers();

        // Table show
        filterData();

        console.log("Data Loaded:", allData);

    } catch (error) {

        console.error(error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="19" class="loading">
                    ❌ Error Loading Data
                </td>
            </tr>
        `;

        alert("Data load nahi hua: " + error.message);
    }
}


// ================= LOAD USERS =================

function loadUsers() {

    const userFilter = document.getElementById("userFilter");

    const currentValue = userFilter.value;

    userFilter.innerHTML = `
        <option value="">All Salesmen</option>
    `;

    const users = [...new Set(
        allData
            .map(row => safe(row["User"]).trim())
            .filter(user => user !== "")
    )].sort();

    users.forEach(user => {

        const option = document.createElement("option");

        option.value = user;
        option.textContent = user;

        userFilter.appendChild(option);

    });

    userFilter.value = currentValue;
}


// ================= FILTER DATA =================

function filterData() {

    const search = document
        .getElementById("search")
        .value
        .toLowerCase()
        .trim();

    const user = document
        .getElementById("userFilter")
        .value;

    const status = document
        .getElementById("statusFilter")
        .value;

    const selectedDate = document
        .getElementById("dateFilter")
        .value;


    filteredData = allData.filter(row => {

        const outletName = String(safe(row["Outlet_Name"])).toLowerCase();

        const billNo = String(safe(row["Bill_No"])).toLowerCase();

        const rowUser = String(safe(row["User"]));

        const rowStatus = String(safe(row["Bill Status"]));


        // Search
        const searchMatch =
            !search ||
            outletName.includes(search) ||
            billNo.includes(search) ||
            rowUser.toLowerCase().includes(search);


        // User
        const userMatch =
            !user || rowUser === user;


        // Status
        const statusMatch =
            !status || rowStatus === status;


        // Date
        let dateMatch = true;

        if (selectedDate) {

            const date = new Date(row["Sale Date"]);

            if (!isNaN(date.getTime())) {

                const yyyy = date.getFullYear();

                const mm = String(date.getMonth() + 1).padStart(2, "0");

                const dd = String(date.getDate()).padStart(2, "0");

                const rowDate = `${yyyy}-${mm}-${dd}`;

                dateMatch = rowDate === selectedDate;

            } else {

                dateMatch = false;

            }
        }


        return searchMatch &&
               userMatch &&
               statusMatch &&
               dateMatch;

    });


    renderTable(filteredData);

    updateSummary(filteredData);

}


// ================= TABLE =================

function renderTable(data) {

    const tableBody = document.getElementById("tableBody");

    tableBody.innerHTML = "";


    if (!data.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="19" class="loading">
                    No Data Found
                </td>
            </tr>
        `;

        return;
    }


    data.forEach((row, index) => {

        const pending = num(
            row["Pending..."] ??
            row["Pending"]
        );

        const recovery = num(row["Recovery"]);


        const tr = document.createElement("tr");


        tr.innerHTML = `

            <td>${safe(row["Distributor"])}</td>

            <td>${safe(row["Bill Status"])}</td>

            <td>${formatDate(row["Sale Date"])}</td>

            <td>${safe(row["User"])}</td>

            <td>${safe(row["Outlet_Name"])}</td>

            <td>${safe(row["Outlet_ID"])}</td>

            <td>${safe(row["Bill_No"])}</td>

            <td>₹${num(row["Amount"]).toLocaleString("en-IN")}</td>

            <td>₹${num(row["Cash"]).toLocaleString("en-IN")}</td>

            <td>₹${num(row["Online"]).toLocaleString("en-IN")}</td>

            <td>₹${num(row["Credit"]).toLocaleString("en-IN")}</td>

            <td>₹${num(row["Cheque"]).toLocaleString("en-IN")}</td>

            <td>${safe(row["Rider name"])}</td>

            <td>${safe(row["Remark"])}</td>

            <td class="recovery">
                ₹${recovery.toLocaleString("en-IN")}
            </td>

            <td class="${pending > 0 ? "pending" : ""}">
                ₹${pending.toLocaleString("en-IN")}
            </td>

            <td>${safe(row["CN"])}</td>

            <td>${safe(row["Description"])}</td>

            <td>
                <button
                    class="edit-btn"
                    onclick="editPayment(${index})"
                >
                    Edit
                </button>
            </td>

        `;


        tableBody.appendChild(tr);

    });

}


// ================= SUMMARY =================

function updateSummary(data) {

    let totalAmount = 0;

    let totalPending = 0;

    let totalRecovery = 0;


    data.forEach(row => {

        totalAmount += num(row["Amount"]);

        totalPending += num(
            row["Pending..."] ??
            row["Pending"]
        );

        totalRecovery += num(row["Recovery"]);

    });


    document.getElementById("totalBills").innerText =
        data.length;


    document.getElementById("totalAmount").innerText =
        "₹" + totalAmount.toLocaleString("en-IN");


    document.getElementById("totalPending").innerText =
        "₹" + totalPending.toLocaleString("en-IN");


    document.getElementById("totalRecovery").innerText =
        "₹" + totalRecovery.toLocaleString("en-IN");

}


// ================= CLEAR FILTER =================

function clearFilters() {

    document.getElementById("search").value = "";

    document.getElementById("userFilter").value = "";

    document.getElementById("statusFilter").value = "";

    document.getElementById("dateFilter").value = "";

    filterData();

}


// ================= EDIT PAYMENT =================

function editPayment(index) {

    const row = filteredData[index];


    document.getElementById("editBillNo").value =
        safe(row["Bill_No"]);


    document.getElementById("editCash").value =
        num(row["Cash"]);


    document.getElementById("editOnline").value =
        num(row["Online"]);


    document.getElementById("editCredit").value =
        num(row["Credit"]);


    document.getElementById("editCheque").value =
        num(row["Cheque"]);


    document.getElementById("editRecovery").value =
        num(row["Recovery"]);


    document.getElementById("editRemark").value =
        safe(row["Remark"]);


    document.getElementById("editModal").style.display =
        "block";

}


// ================= CLOSE MODAL =================

function closeModal() {

    document.getElementById("editModal").style.display =
        "none";

}


// ================= SAVE PAYMENT =================

function savePayment() {

    alert(
        "Payment update system abhi Google Sheet API me add karna baki hai."
    );

}