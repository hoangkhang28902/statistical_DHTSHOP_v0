 // ======== Token Handling =========
    function saveToken() {
      const token = document.getElementById("token").value;
      if (!token) return alert("Vui lòng nhập token");
      localStorage.setItem("dht_token", token);
      checkTokenValidity(token);
    }

    function clearToken() {
      localStorage.removeItem("dht_token");
      document.getElementById("token").value = "";
      document.getElementById("token-status").textContent = "Đã xóa token.";
    }

    function loadSavedToken() {
      const token = localStorage.getItem("dht_token");
      if (token) {
        document.getElementById("token").value = token;
        checkTokenValidity(token);
      }
    }

    function checkTokenValidity(token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        if (exp && exp < now) {
          document.getElementById("token-status").textContent = "⚠️ Token đã hết hạn.";
        } else {
          const expDate = new Date(exp * 1000).toLocaleString();
          document.getElementById("token-status").textContent = `✅ Token hợp lệ, hết hạn lúc: ${expDate}`;
        }
      } catch (e) {
        document.getElementById("token-status").textContent = "❌ Token không hợp lệ.";
      }
    }

    loadSavedToken();

    // ======== SKU của Combo, LinkCoffee, Akira =========
    const comboSkus = ["CB-2.5", "CB-5.0", "CB-15", "CB-35", "CB-75", "Cb-150", "CB-300","cb_spa"];
    const linkCoffeeSkus = [
      "DHT_ComTrua", "DHT_BlackCoffee", "DHT-MilkCoffee", "DHT_VietnameseWhiteCoffeeIced",
      "DHT_SaltedCream", "DHT_SaltedCreamCoffee", "DHT_CoconutPandanLatte", "DHT_PandanCoconutMilkTea",
      "DHT_LiptonIcedTea", "DHT_LycheeIcedTea", "DHT_PlumIcedTea", "DHT_PlumIced", "DHT_GuavaIcedTea",
      "DHT_StrawberryTea", "DHT_Lemonade", "DHT_PineappleJuice", "DHT_OrangeJuice", "DHT_PassionFruitJuice",
      "DHT_MixedFruitJuice", "DHT_IceYogurt", "DHT_StrawberryYogurt", "DHT_PeachYogurt"
    ];
    const sanphamchuyendiemSkus = ["001", "002", "003"]; // sku sản phẩm chuyển điểm

    // const akiraSkus = []; // Akira sẽ là các SKU không thuộc Combo và LinkCoffee
    async function fetchAkiraSkus() {
  const token = document.getElementById("token")?.value;
  if (!token) return [];

  const res = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
    headers: { "Authorization": `Bearer ${token}` }
  });

  const json = await res.json();
  const orders = json.data?.array || [];

  const allSkus = new Set();
  orders.forEach(order => {
    const cart = JSON.parse(order.cartSnapshot || "[]");
    cart.forEach(product => {
      const sku = product.productDetail?.sku;
      if (sku) allSkus.add(sku);
    });
  });

  const knownSkus = new Set([
    ...comboSkus,
    ...linkCoffeeSkus,
    ...sanphamchuyendiemSkus
  ]);

  const akiraSkus = Array.from(allSkus).filter(sku => !knownSkus.has(sku));
  console.log("📦 akiraSkus:", akiraSkus);
  return akiraSkus;
}


    let validSkus = comboSkus;  // Mặc định là Combo
     
    // Function to update validSkus based on selected order type
    function updateValidSkus() {
      const orderType = document.getElementById("orderTypeDropdown").value;
      if (orderType === "combo") {
        validSkus = comboSkus;  // Sử dụng SKU của Combo
      } else if (orderType === "linkcoffee") {
        validSkus = linkCoffeeSkus;  // Sử dụng SKU của LinkCoffee
      }
       else if (orderType === "akira") {
        validSkus = akiraSkus;  // Akira không có SKU mặc định, kiểm tra ngoài
      }
    }

    // ======== Tính toán khoảng thời gian 24h của một ngày =========
    function getStartOfDay(dateStr) {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0); // Đặt giờ, phút, giây, mili giây = 00:00:00
      return date;
    }

    function getEndOfDay(dateStr) {
      const date = new Date(dateStr);
      date.setHours(23, 59, 59, 999); // Đặt giờ, phút, giây, mili giây = 23:59:59
      return date;
    }

    // ======== Tính tuần =========
    function getStartEndOfWeek(dateStr) {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Tính thứ Hai của tuần

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Cộng 6 ngày để được Chủ nhật

      const formatDate = (d) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

      return {
        start: formatDate(startOfWeek),
        end: formatDate(endOfWeek),
      };
    }

    // ======== Tải ngày =========
    async function loadDates() {
      const token = document.getElementById("token").value;
      const dropdown = document.getElementById("dateDropdown");
      dropdown.innerHTML = "<option>Đang tải ngày...</option>";

      try {
        const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        const json = await response.json();
        const orders = json.data?.array || [];

        const uniqueDates = [...new Set(
          orders.map(o => new Date(o.created_at).toISOString().split('T')[0])
        )];

        dropdown.innerHTML = "";
        uniqueDates.sort((a, b) => new Date(b) - new Date(a)).forEach(date => {  
          const option = document.createElement("option");
          option.value = date;
          option.textContent = date;
          dropdown.appendChild(option);
        });

      } catch (err) {
        alert("Lỗi khi tải danh sách ngày: " + err.message);
      }
    }

    function formatDate(dateStr) {
      try {
        const date = new Date(dateStr);
        return `${date.toLocaleTimeString()} ${date.toLocaleDateString('vi-VN')}`;
      } catch {
        return dateStr;
      }
    }

    // ======== Tải tuần =========
    async function loadWeeks() {
      const token = document.getElementById("token").value;
      const dropdown = document.getElementById("weekDropdown");
      dropdown.innerHTML = "<option>Đang tải tuần...</option>";

      try {
        const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        const json = await response.json();
        const orders = json.data?.array || [];

        const uniqueWeeks = [...new Set(
          orders.map(o => {
            const { start, end } = getStartEndOfWeek(o.created_at);
            return `${start} - ${end}`;
          })
        )];

        dropdown.innerHTML = "";
        uniqueWeeks.sort((a, b) => new Date(b.split(' ')[0]) - new Date(a.split(' ')[0])).forEach(week => { 
          const option = document.createElement("option");
          option.value = week;
          option.textContent = week;
          dropdown.appendChild(option);
        });

      } catch (err) {
        alert("Lỗi khi tải danh sách tuần: " + err.message);
      }
    }

// ======== Xuất đơn hàng theo ngày =========
async function exportOrders() {
  const token = document.getElementById("token").value;
  const selectedDate = document.getElementById("dateDropdown").value;

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];

    const headers = [
       "STT", "Mã đơn hàng","Trạng thái","Loại thanh toán","Tổng tiền","Người duyệt","SỐ ID", "Họ và tên", "Combo", "Số lượng",
      "Tổng số combo", "LOẠI HÀNG", "SỐ LƯỢNG",
      "ĐỊA CHỈ NHẬN HÀNG", "SĐT NHẬN HÀNG", "GHI CHÚ",
      "Ngày mua hàng", "NGÀY GỬI HÀNG"
    ];

    // Lọc đơn hàng theo ngày và SKU
    const filteredOrders = orders
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const startOfDay = getStartOfDay(selectedDate);
        const endOfDay = getEndOfDay(selectedDate);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        // Nếu orderType là Akira, lọc SKU không thuộc combo và linkcoffee
        if (validSkus === akiraSkus) {
          return cart.some(product => !comboSkus.includes(product.productDetail?.sku) && !linkCoffeeSkus.includes(product.productDetail?.sku));
        } else {
          return cart.some(product => validSkus.includes(product.productDetail?.sku)); // Lọc theo SKU Combo hoặc LinkCoffee
        }
      });

    const rows = filteredOrders.map((item, idx) => {
      const cart = JSON.parse(item.cartSnapshot || "[]");
      
      let adminData = "";
      try {
        adminData = JSON.parse(item.admin); // Giải mã chuỗi JSON trong item.admin
      } catch (e) {
        console.error("Không thể giải mã JSON từ admin:", e);
      }

      return [
       
        idx + 1,
        item.orderId || "", 
        item.status || "", 
        item.walletName || "",
        item.totalAmount || "",
        adminData.full_name || "",
        item.userPhone || "",
        item.userFullName || "",
        cart[0]?.unitPrice || "",
        cart[0]?.quantity || "",
        "", "", "", 
        item.orderAddress || "",
        item.orderPhone || "",
        "", 
        formatDate(item.created_at),
        ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const urlBlob = URL.createObjectURL(blob);

    const link = document.getElementById("downloadLink");
    const fileName = `orders_${selectedDate}.csv`;
    link.href = urlBlob;
    link.download = fileName;
    link.style.display = "inline";
    link.textContent = `📥 Tải file CSV theo ngày: ${selectedDate}`;

  } catch (err) {
    alert("Lỗi tải đơn hàng: " + err.message);
  }
}

// ======== Xuất đơn hàng theo tuần =========
async function exportOrdersByWeek() {
  const token = document.getElementById("token").value;
  const selectedWeek = document.getElementById("weekDropdown").value;

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];

     const headers = [
       "STT", "Mã đơn hàng","Trạng thái","Loại thanh toán","Tổng tiền","Người Duyệt","SỐ ID", "Họ và tên", "Combo", "Số lượng",
      "Tổng số combo", "LOẠI HÀNG", "SỐ LƯỢNG",
      "ĐỊA CHỈ NHẬN HÀNG", "SĐT NHẬN HÀNG", "GHI CHÚ",
      "Ngày mua hàng", "NGÀY GỬI HÀNG"
    ];
    // Lọc đơn hàng theo tuần và SKU
    const filteredOrders = orders
      .filter(item => {
        const { start, end } = getStartEndOfWeek(item.created_at);
        return `${start} - ${end}` === selectedWeek;
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        // Nếu orderType là Akira, lọc SKU không thuộc combo và linkcoffee
        if (validSkus === akiraSkus) {
          return cart.some(product => !comboSkus.includes(product.productDetail?.sku) && !linkCoffeeSkus.includes(product.productDetail?.sku));
        } else {
          return cart.some(product => validSkus.includes(product.productDetail?.sku)); // Lọc theo SKU Combo hoặc LinkCoffee
        }
      });

    const rows = filteredOrders.map((item, idx) => {
      const cart = JSON.parse(item.cartSnapshot || "[]");
       let adminData = "";
      try {
        adminData = JSON.parse(item.admin); // Giải mã chuỗi JSON trong item.admin
      } catch (e) {
        console.error("Không thể giải mã JSON từ admin:", e);
      }

      return [
       
        idx + 1,
        item.orderId || "", 
        item.status || "", 
        item.walletName || "",
        item.totalAmount || "",
        adminData.full_name || "",
        item.userPhone || "",
        item.userFullName || "",
        cart[0]?.unitPrice || "",
        cart[0]?.quantity || "",
        "", "", "", 
        item.orderAddress || "",
        item.orderPhone || "",
        "", 
        formatDate(item.created_at),
        ""
      ];
    });
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const urlBlob = URL.createObjectURL(blob);

    const link = document.getElementById("downloadLink");
    const fileName = `orders_week_${selectedWeek.replace(' ', '_')}.csv`;
    link.href = urlBlob;
    link.download = fileName;
    link.style.display = "inline";
    link.textContent = `📥 Tải file CSV theo tuần: ${selectedWeek}`;

  } catch (err) {
    alert("Lỗi tải đơn hàng: " + err.message);
  }
}

 // ======== Tải sản phẩm theo danh mục =========
    async function fetchAndExportProducts() {
      const token = document.getElementById("token").value;
      const selectedCategory = document.getElementById("categoryDropdown").value;
      if (!selectedCategory) {
        alert("Vui lòng chọn danh mục!");
        return;
      }
      const limit = 50000;
      let page = 1;
      let allProducts = [];

      try {
        let hasMoreProducts = true;
        while (hasMoreProducts) {
          const url = `https://dhtshop.vn/api/admin/getAllProducts?page=${page}&limit=${limit}`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();

          // Lấy đúng mảng sản phẩm
          const arr = data.data?.array || [];
          // Lọc theo category đã chọn
          const filtered = arr.filter(item => item.category_name === selectedCategory);
          allProducts = allProducts.concat(filtered);

          // Nếu số sản phẩm trả về < limit thì đã hết trang
          if (!arr.length || arr.length < limit) {
            hasMoreProducts = false;
          } else {
            page++;
          }
        }

        if (allProducts.length > 0) {
          exportToCSV(allProducts);
        } else {
          alert("Không có sản phẩm nào thuộc danh mục này!");
        }
      } catch (error) {
        alert('Lỗi trong quá trình gửi yêu cầu: ' + error);
      }
    }

    // ======== Xuất CSV =========
    function exportToCSV(products) {
      const headers = [
        "STT", "ID", "SKU", "Tên sản phẩm", "Giá", "Is Show", "Danh mục", "Danh mục phụ"
      ];

      const rows = products.map((product, idx) => [
        idx + 1,
        product.id || "",
        product.sku || "",
        product.name || "",
        product.price || "",
        product.isShow || "",
        product.category_name || "",
        product.sub_category_name || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "dhtshop_products.csv";
      a.click();
    }

// Tải danh mục từ sản phẩm
async function loadCategoriesFromProducts() {
  const token = document.getElementById("token").value;
  const dropdown = document.getElementById("categoryDropdown");
  dropdown.innerHTML = "<option>Đang tải danh mục...</option>";

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/getAllProducts?page=1&limit=50000", {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    const products = data.data?.array || [];

    // Lấy danh sách các danh mục sản phẩm
    const categories = [...new Set(products.map(product => product.category_name))];

    dropdown.innerHTML = ""; // Xóa các mục hiện tại trong dropdown
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Chọn danh mục --";
    dropdown.appendChild(defaultOption);

    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      dropdown.appendChild(option);
    });

  } catch (err) {
    alert("Lỗi khi tải danh mục: " + err.message);
  }
}







// ======== Hàm Thống Kê Đơn Hàng Combo =========
async function generateComboOrderStatistics() {
  const token = document.getElementById("token").value;
  const selectedDate = document.getElementById("dateDropdown").value;

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];

    // Lọc đơn hàng theo ngày và SKU Combo
    const filteredOrders = orders
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const startOfDay = getStartOfDay(selectedDate);
        const endOfDay = getEndOfDay(selectedDate);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        return cart.some(product => validSkus.includes(product.productDetail?.sku));  // Lọc các sản phẩm thuộc Combo
      });

    // Thống kê đơn hàng Combo
    let totalComboOrders = 0;
    let totalAmount = 0;
    filteredOrders.forEach(order => {
      totalComboOrders++;
      totalAmount += order.totalAmount || 0;
    });

    // Hiển thị kết quả thống kê lên giao diện
    document.getElementById("totalComboOrders").textContent = totalComboOrders;
    document.getElementById("totalAmount").textContent = totalAmount.toLocaleString() + " VND";

  } catch (err) {
    alert("Lỗi khi thống kê đơn hàng Combo: " + err.message);
  }
}
// ======== Lấy danh sách tháng từ API =========
async function loadMonthsFromAPI() {
  const token = document.getElementById("token").value;
  const dropdown = document.getElementById("monthDropdown");

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];

    // Lấy tất cả các tháng từ dữ liệu đơn hàng
    const months = [...new Set(orders.map(order => {
      const date = new Date(order.created_at);
      return String(date.getMonth() + 1).padStart(2, '0'); // Đảm bảo định dạng 2 chữ số
    }))];

    // Cập nhật dropdown tháng
    dropdown.innerHTML = ""; // Reset dropdown
    months.forEach(month => {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = `Tháng ${month}`;
      dropdown.appendChild(option);
    });

  } catch (err) {
    alert("Lỗi khi tải danh sách tháng: " + err.message);
  }
}

// ======== Thống kê đơn hàng Combo theo tháng =========
async function generateMonthlyComboOrderStatistics() {
  const token = document.getElementById("token").value;
  const selectedMonth = document.getElementById("monthDropdown").value;

  if (!selectedMonth) {
    alert("Vui lòng chọn một tháng để thống kê.");
    return;
  }

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];

    // Lọc đơn hàng theo tháng và SKU Combo
    const filteredOrders = orders
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const month = String(itemDate.getMonth() + 1).padStart(2, '0');  // Lấy tháng (từ 0 đến 11, cộng thêm 1 để đúng tháng)
        return month === selectedMonth;
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        return cart.some(product => validSkus.includes(product.productDetail?.sku));  // Lọc các sản phẩm thuộc Combo
      });

    // Thống kê đơn hàng Combo
    let totalComboOrders = 0;
    let totalAmount = 0;
    let totalSuccessOrders = 0;
    let totalCanceledOrders = 0;

    filteredOrders.forEach(order => {
      totalComboOrders++;
      totalAmount += order.totalAmount || 0;

      // Phân loại theo trạng thái đơn hàng
      if (order.status === 'success') {
        totalSuccessOrders++;  // Đếm đơn thành công
      } else if (order.status === 'cancel') {
        totalCanceledOrders++;  // Đếm đơn bị hủy
      }
    });

    // Hiển thị kết quả thống kê lên giao diện
    document.getElementById("totalComboOrders").textContent = totalComboOrders;
    document.getElementById("totalAmount").textContent = totalAmount.toLocaleString() + " VND";
    document.getElementById("totalSuccessOrders").textContent = totalSuccessOrders;
    document.getElementById("totalCanceledOrders").textContent = totalCanceledOrders;

  } catch (err) {
    alert("Lỗi khi thống kê đơn hàng Combo theo tháng: " + err.message);
  }
}


// Gọi hàm loadMonthsFromAPI khi trang được tải
loadMonthsFromAPI();

// ======== Hàm tải CSV theo tháng =========


let salesChart = null; // Biến toàn cục để lưu trữ đối tượng biểu đồ


// ======== Thống kê đơn hàng Combo theo tháng =========



// Biến toàn cục lưu dữ liệu bảng
let salesDataGlobal = {};

async function generateMonthlyComboOrderStatistics() {
  const token = document.getElementById("token").value;
  const selectedMonth = document.getElementById("monthDropdown").value;
  if (!selectedMonth) return alert("Vui lòng chọn một tháng để thống kê.");

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];
    const filteredOrders = orders
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const month = String(itemDate.getMonth() + 1).padStart(2, '0');
        return month === selectedMonth;
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        return cart.some(product => validSkus.includes(product.productDetail?.sku));
      });

    let totalComboOrders = 0, totalAmount = 0, totalSuccessOrders = 0, totalCanceledOrders = 0;
    const salesByPerson = {};

    filteredOrders.forEach(order => {
      totalComboOrders++;
      totalAmount += order.totalAmount || 0;
      if (order.status === 'success') totalSuccessOrders++;
      else if (order.status === 'cancel') totalCanceledOrders++;

      const personName = order.userFullName || 'Không xác định';
      const phone = order.userPhone || 'Không xác định';

      if (!salesByPerson[personName]) {
        salesByPerson[personName] = {
          totalAmount: 0,
          totalOrders: 0,
          userId: phone
        };
      }
      salesByPerson[personName].totalAmount += order.totalAmount || 0;
      salesByPerson[personName].totalOrders += 1;
    });

    document.getElementById("totalComboOrders").textContent = totalComboOrders;
    document.getElementById("totalAmount").textContent = totalAmount.toLocaleString() + " VND";
    document.getElementById("totalSuccessOrders").textContent = totalSuccessOrders;
    document.getElementById("totalCanceledOrders").textContent = totalCanceledOrders;

    renderSalesChart(salesByPerson);
    salesDataGlobal = salesByPerson;
    updateSalesTable();

  } catch (err) {
    alert("Lỗi khi thống kê đơn hàng Combo theo tháng: " + err.message);
  }
}

function renderSalesChart(salesByPerson) {
  const topSales = Object.entries(salesByPerson)
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .slice(0, 10);

  const labels = topSales.map(([name]) => name);
  const data = topSales.map(([, d]) => d.totalAmount);

  const ctx = document.getElementById('salesChart').getContext('2d');

  // Hủy biểu đồ cũ nếu có
  if (window.salesChart?.destroy) window.salesChart.destroy();

  // Hàm định dạng đơn vị tiền
  const formatCurrency = value =>
    value >= 1_000_000_000
      ? (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ'
      : (value / 1_000_000).toFixed(0) + ' triệu';

  // Vẽ biểu đồ mới
  window.salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Doanh thu theo người (VND)', // Hiện label
        data,
        backgroundColor: '#388E3C',
        borderColor: '#388E3C',
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 10
          }
        },
       
        tooltip: {
          callbacks: {
            label: ctx => {
              const name = ctx.chart.data.labels[ctx.dataIndex];
              const value = ctx.raw.toLocaleString('vi-VN') + " VND";
              return `${name}: ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => formatCurrency(value)
          }
        }
      }
    }
  });
}


function updateSalesTable() {
  const keyword = document.getElementById("salesFilterInput").value.toLowerCase();
  const sortOrder = document.getElementById("sortSelect")?.value || "desc";

  const filtered = Object.entries(salesDataGlobal)
    .filter(([name]) => name.toLowerCase().includes(keyword))
   
    .sort((a, b) => sortOrder === "asc"
      ? a[1].totalAmount - b[1].totalAmount
      : b[1].totalAmount - a[1].totalAmount
    );

  renderSalesTable(filtered);
}



// Sự kiện lọc
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("salesFilterInput").addEventListener("input", updateSalesTable);
  document.getElementById("sortSelect")?.addEventListener("change", updateSalesTable);
  document.getElementById("exportFullCSVButton").addEventListener("click", () => {
    const headers = ["STT", "Số điện thoại", "Họ và tên", "Số đơn", "Tổng giá trị (VND)"];
    const rows = Object.entries(salesDataGlobal).map((item, index) => [
      index + 1,
      item[1].userId,
      item[0],
      item[1].totalOrders,
      item[1].totalAmount
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(f => `"${String(f).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doanhso_thang.csv`;
    a.click();
  });
});

function renderSalesTable(filteredSales) {
  const tbody = document.querySelector("#salesTable tbody");
  const pageSize = 10;
  let currentPage = 1;

  function renderPage(page) {
    currentPage = page;
    tbody.innerHTML = '';
    const start = (page - 1) * pageSize;
    const pageItems = filteredSales.slice(start, start + pageSize);

    pageItems.forEach(([name, data], index) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${start + index + 1}</td>
        <td>${data.userId}</td>
        <td>${name}</td>
        <td>${data.totalOrders}</td>
        <td>${data.totalAmount.toLocaleString('vi-VN')} VND</td>
      `;
    });

    // Phân trang dạng 6 ô + ... và nút trước/sau
    const totalPages = Math.ceil(filteredSales.length / pageSize);
    const pagination = document.getElementById("salesPagination");
    pagination.innerHTML = '';

    // Nút Trang trước
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Trang trước";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => renderPage(currentPage - 1);
    pagination.appendChild(prevBtn);

    // Nút phân trang chính
    const createBtn = (page, text = page) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.disabled = page === currentPage;
      btn.onclick = () => renderPage(page);
      pagination.appendChild(btn);
    };

    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) createBtn(i);
    } else {
      createBtn(1);
      if (currentPage > 3) {
        const span = document.createElement("span");
        span.textContent = "...";
        pagination.appendChild(span);
      }
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) end = 4;
      if (currentPage >= totalPages - 2) start = totalPages - 3;

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) createBtn(i);
      }

      if (currentPage < totalPages - 2) {
        const span = document.createElement("span");
        span.textContent = "...";
        pagination.appendChild(span);
      }
      createBtn(totalPages);
    }

    // Nút Trang sau
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Trang sau";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => renderPage(currentPage + 1);
    pagination.appendChild(nextBtn);

    // ✅ Tính toán thống kê
    const totalParticipants = filteredSales.length;
    const countAbove50M = filteredSales.filter(([_, d]) => d.totalAmount >= 50000000).length;
    const percentageAbove50M = totalParticipants > 0
      ? Math.round((countAbove50M / totalParticipants) * 100)
      : 0;

    document.getElementById("totalParticipants").textContent = totalParticipants;
    document.getElementById("percentageAbove50M").textContent = `${percentageAbove50M}%`;
    document.getElementById("above50MInfo").textContent = `(${countAbove50M}/${totalParticipants})`;
  }

  renderPage(currentPage);
}

// file: statistics.js

function handleStatTypeChange() {
  const type = document.getElementById("statTypeDropdown").value;
  const monthDropdown = document.getElementById("monthDropdown");
  const quarterDropdown = document.getElementById("quarterDropdown");
  const yearDropdown = document.getElementById("yearDropdown");

  // Reset visibility
  monthDropdown.style.display = 'none';
  quarterDropdown.style.display = 'none';
  yearDropdown.style.display = 'inline-block';

  if (type === 'month') {
    monthDropdown.style.display = 'inline-block';
  } else if (type === 'quarter') {
    quarterDropdown.style.display = 'inline-block';
  }
}

async function generateStatistics() {
  const type = document.getElementById("statTypeDropdown").value;
  if (type === 'month') {
    await generateMonthlyComboOrderStatistics();
  } else if (type === 'quarter') {
    await generateQuarterlyComboOrderStatistics();
  } else if (type === 'year') {
    await generateYearlyComboOrderStatistics();
  }
}

async function generateQuarterlyComboOrderStatistics() {
  const token = document.getElementById("token").value;
  const selectedQuarter = document.getElementById("quarterDropdown").value;
  const selectedYear = document.getElementById("yearDropdown").value;
  if (!selectedQuarter || !selectedYear) return alert("Vui lòng chọn quý và năm.");

  const [startMonth, endMonth] = {
    'Q1': [0, 2], 'Q2': [3, 5], 'Q3': [6, 8], 'Q4': [9, 11]
  }[selectedQuarter];

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];
    const filteredOrders = orders
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const year = itemDate.getFullYear();
        const month = itemDate.getMonth();
        return year === parseInt(selectedYear) && month >= startMonth && month <= endMonth;
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        return cart.some(product => validSkus.includes(product.productDetail?.sku));
      });

    processStatistics(filteredOrders);

  } catch (err) {
    alert("Lỗi khi thống kê đơn hàng Combo theo quý: " + err.message);
  }
}

async function generateYearlyComboOrderStatistics() {
  const token = document.getElementById("token").value;
  const selectedYear = document.getElementById("yearDropdown").value;
  if (!selectedYear) return alert("Vui lòng chọn năm.");

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];
    const filteredOrders = orders
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const year = itemDate.getFullYear();
        return year === parseInt(selectedYear);
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        return cart.some(product => validSkus.includes(product.productDetail?.sku));
      });

    processStatistics(filteredOrders);

  } catch (err) {
    alert("Lỗi khi thống kê đơn hàng Combo theo năm: " + err.message);
  }
}

function processStatistics(filteredOrders) {
  let totalComboOrders = 0, totalAmount = 0, totalSuccessOrders = 0, totalCanceledOrders = 0;
  const salesByPerson = {};

  filteredOrders.forEach(order => {
    totalComboOrders++;
    totalAmount += order.totalAmount || 0;
    if (order.status === 'success') totalSuccessOrders++;
    else if (order.status === 'cancel') totalCanceledOrders++;

    const personName = order.userFullName || 'Không xác định';
    const phone = order.userPhone || 'Không xác định';

    if (!salesByPerson[personName]) {
      salesByPerson[personName] = {
        totalAmount: 0,
        totalOrders: 0,
        userId: phone
      };
    }
    salesByPerson[personName].totalAmount += order.totalAmount || 0;
    salesByPerson[personName].totalOrders += 1;
  });

  document.getElementById("totalComboOrders").textContent = totalComboOrders;
  document.getElementById("totalAmount").textContent = totalAmount.toLocaleString() + " VND";
  document.getElementById("totalSuccessOrders").textContent = totalSuccessOrders;
  document.getElementById("totalCanceledOrders").textContent = totalCanceledOrders;

  renderSalesChart(salesByPerson);
  salesDataGlobal = salesByPerson;
  updateSalesTable();
}
// file: statistics.js



function handleStatTypeChange() {
  const type = document.getElementById("statTypeDropdown").value;
  const monthDropdown = document.getElementById("monthDropdown");
  const quarterDropdown = document.getElementById("quarterDropdown");
  const yearDropdown = document.getElementById("yearDropdown");

  monthDropdown.style.display = 'none';
  quarterDropdown.style.display = 'none';
  yearDropdown.style.display = 'none';

  if (type === 'month') {
    monthDropdown.style.display = 'inline-block';
  } else if (type === 'quarter') {
    quarterDropdown.style.display = 'inline-block';
  } else if (type === 'year') {
    yearDropdown.style.display = 'inline-block';
  }
}

async function generateStatistics() {
  const type = document.getElementById("statTypeDropdown").value;
  if (type === 'month') {
    await generateMonthlyComboOrderStatistics();
  } else if (type === 'quarter') {
    await generateQuarterlyComboOrderStatistics();
  } else if (type === 'year') {
    await generateYearlyComboOrderStatistics();
  }
}

async function generateQuarterlyComboOrderStatistics() {
  const token = document.getElementById("token").value;
  const selectedQuarter = document.getElementById("quarterDropdown").value;
  const selectedYear = new Date().getFullYear();
  if (!selectedQuarter) return alert("Vui lòng chọn quý.");

  const [startMonth, endMonth] = {
    'Q1': [0, 2], 'Q2': [3, 5], 'Q3': [6, 8], 'Q4': [9, 11]
  }[selectedQuarter];

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];
    const filteredOrders = orders
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const year = itemDate.getFullYear();
        const month = itemDate.getMonth();
        return year === selectedYear && month >= startMonth && month <= endMonth;
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        return cart.some(product => validSkus.includes(product.productDetail?.sku));
      });

    processStatistics(filteredOrders);

  } catch (err) {
    alert("Lỗi khi thống kê đơn hàng Combo theo quý: " + err.message);
  }
}

async function generateYearlyComboOrderStatistics() {
  const token = document.getElementById("token").value;
  const selectedYear = document.getElementById("yearDropdown").value;
  if (!selectedYear) return alert("Vui lòng chọn năm.");

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];
    const filteredOrders = orders
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const year = itemDate.getFullYear();
        return year === parseInt(selectedYear);
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        return cart.some(product => validSkus.includes(product.productDetail?.sku));
      });

    processStatistics(filteredOrders);

  } catch (err) {
    alert("Lỗi khi thống kê đơn hàng Combo theo năm: " + err.message);
  }
}

async function generateMonthlyComboOrderStatistics() {
  const token = document.getElementById("token").value;
  const selectedMonth = document.getElementById("monthDropdown").value;
  const selectedYear = new Date().getFullYear();
  if (!selectedMonth) return alert("Vui lòng chọn một tháng để thống kê.");

  try {
    const response = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const json = await response.json();
    const orders = json.data?.array || [];
    const filteredOrders = orders
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const month = String(itemDate.getMonth() + 1).padStart(2, '0');
        const year = itemDate.getFullYear();
        return month === selectedMonth && year === selectedYear;
      })
      .filter(item => {
        const cart = JSON.parse(item.cartSnapshot || "[]");
        return cart.some(product => validSkus.includes(product.productDetail?.sku));
      });

    processStatistics(filteredOrders);

  } catch (err) {
    alert("Lỗi khi thống kê đơn hàng Combo theo tháng: " + err.message);
  }
}


function renderRevenueLineChart(revenueByDate) {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  const labels = Object.keys(revenueByDate).sort();
  const revenueData = labels.map(date => revenueByDate[date]?.totalAmount || 0);
  const orderData = labels.map(date => revenueByDate[date]?.orderCount || 0);

  if (window.revenueChart?.destroy) window.revenueChart.destroy();

  window.revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Doanh thu theo ngày',
          data: revenueData,
          fill: false,
          borderColor: 'rgb(77, 192, 75)',
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Số lượng đơn hàng',
          data: orderData,
          fill: false,
          borderColor: 'orange',
          tension: 0.1,
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + ctx.raw.toLocaleString('vi-VN') + (ctx.dataset.label.includes('Doanh thu') ? ' VND' : ' đơn')
          }
        },
        legend: {
          display: true
        }
      },
      scales: {
        x: {
          ticks: {
            display: false
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          position: 'left',
          ticks: {
            callback: value => {
              if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
              if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + ' triệu';
              return value.toLocaleString('vi-VN');
            }
          }
        },
        y2: {
          beginAtZero: true,
          position: 'right',
          display: false,
          ticks: {
            stepSize: 1
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

function processStatistics(filteredOrders) {
  let totalComboOrders = 0, totalAmount = 0, totalSuccessOrders = 0, totalCanceledOrders = 0;
  const salesByPerson = {};
  const revenueByDate = {};

  filteredOrders.forEach(order => {
    totalComboOrders++;
    totalAmount += order.totalAmount || 0;
    if (order.status === 'success') totalSuccessOrders++;
    else if (order.status === 'cancel') totalCanceledOrders++;

    const personName = order.userFullName || 'Không xác định';
    const phone = order.userPhone || 'Không xác định';

    if (!salesByPerson[personName]) {
      salesByPerson[personName] = {
        totalAmount: 0,
        totalOrders: 0,
        userId: phone
      };
    }
    salesByPerson[personName].totalAmount += order.totalAmount || 0;
    salesByPerson[personName].totalOrders += 1;

    const date = new Date(order.created_at).toISOString().split('T')[0];
    if (!revenueByDate[date]) revenueByDate[date] = { totalAmount: 0, orderCount: 0 };
    revenueByDate[date].totalAmount += order.totalAmount || 0;
    revenueByDate[date].orderCount += 1;
  });

  document.getElementById("totalComboOrders").textContent = totalComboOrders;
  document.getElementById("totalAmount").textContent = totalAmount.toLocaleString() + " VND";
  document.getElementById("totalSuccessOrders").textContent = totalSuccessOrders;
  document.getElementById("totalCanceledOrders").textContent = totalCanceledOrders;

  renderSalesChart(salesByPerson);
  renderRevenueLineChart(revenueByDate);
  salesDataGlobal = salesByPerson;
  updateSalesTable();
}



// function showChart(type) {
//   const salesChart = document.getElementById('salesChart');
//   const revenueChart = document.getElementById('revenueChart');

//   salesChart.style.display = type === 'sales' ? 'block' : 'none';
//   revenueChart.style.display = type === 'revenue' ? 'block' : 'none';

//   document.getElementById('btn-sales').classList.toggle('active', type === 'sales');
//   document.getElementById('btn-revenue').classList.toggle('active', type === 'revenue');
// }

function showChart(type) {
  const salesChart = document.getElementById('salesChart');
  const revenueChart = document.getElementById('revenueChart');
  const treeChart = document.getElementById('treeChart');
  const revenueSystemChart = document.getElementById('revenueSystemChart');
  const revenueTeamChart = document.getElementById('revenueTeamChart');

  if (salesChart) salesChart.style.display = type === 'sales' ? 'block' : 'none';
  if (revenueChart) revenueChart.style.display = type === 'revenue' ? 'block' : 'none';
  if (treeChart) treeChart.style.display = type === 'tree' ? 'block' : 'none';
  if (revenueSystemChart) revenueSystemChart.style.display = type === 'revenueSystem' ? 'block' : 'none';
  if (revenueTeamChart) revenueTeamChart.style.display = type === 'revenueTeam' ? 'block' : 'none';

  const btnSales = document.getElementById('btn-sales');
  const btnRevenue = document.getElementById('btn-revenue');
  const btnPeronal = document.getElementById('btn-peronal');
  const btnRevenueSystem = document.getElementById('btn-revenueSystem');
  const btnRevenueTeam = document.getElementById('btn-revenueTeam');

  if (btnSales) btnSales.classList.toggle('active', type === 'sales');
  if (btnRevenue) btnRevenue.classList.toggle('active', type === 'revenue');
  if (btnPeronal) btnPeronal.classList.toggle('active', type === 'tree');
  if (btnRevenueSystem) btnRevenueSystem.classList.toggle('active', type === 'revenueSystem');
  if (btnRevenueTeam) btnRevenueTeam.classList.toggle('active', type === 'revenueTeam');
}



// DOM hiển thị quý và năm

// window.addEventListener("DOMContentLoaded", () => {
//   const monthDropdown = document.getElementById("monthDropdown");
//   const quarterDropdown = document.getElementById("quarterDropdown");
//   const yearDropdown = document.getElementById("yearDropdown");

//   monthDropdown.innerHTML = '<option value="">-- Chọn tháng --</option>';
//   for (let i = 1; i <= 12; i++) {
//     const val = String(i).padStart(2, '0');
//     monthDropdown.innerHTML += `<option value="${val}">${val}</option>`;
//   }

//   quarterDropdown.innerHTML = '<option value="">-- Chọn quý --</option>';
//   ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
//     quarterDropdown.innerHTML += `<option value="${q}">${q}</option>`;
//   });

//   yearDropdown.innerHTML = '<option value="">-- Chọn năm --</option>';

//   const token = document.getElementById("token")?.value;
//   if (token) {
//     fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=500&status=all", {
//       headers: {
//         "Authorization": `Bearer ${token}`
//       }
//     })
//       .then(res => res.json())
//       .then(json => {
//         const years = [...new Set((json.data?.array || []).map(o => new Date(o.created_at).getFullYear()))].sort((a, b) => b - a);
//         years.forEach(y => {
//           yearDropdown.innerHTML += `<option value="${y}">${y}</option>`;
//         });
//       });
//   }

//   handleStatTypeChange();
// });

window.addEventListener("DOMContentLoaded", () => {
  const statType = document.getElementById("statTypeDropdown");
  const monthDropdown = document.getElementById("monthDropdown");
  const quarterDropdown = document.getElementById("quarterDropdown");
  const yearDropdown = document.getElementById("yearDropdown");
  const token = document.getElementById("token")?.value;

  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const currentYear = today.getFullYear();
  const currentQuarter = `Q${Math.floor(today.getMonth() / 3) + 1}`;

  // Mặc định chọn "thống kê theo tháng"
  statType.value = "month";
  handleStatTypeChange();

  // Khởi tạo dropdown tháng
  monthDropdown.innerHTML = '';
  for (let i = 1; i <= 12; i++) {
    const val = String(i).padStart(2, '0');
    const selected = val === currentMonth ? 'selected' : '';
    monthDropdown.innerHTML += `<option value="${val}" ${selected}>Tháng ${val}</option>`;
  }
  
  // Khởi tạo dropdown quý
  quarterDropdown.innerHTML = '';
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    const selected = q === currentQuarter ? 'selected' : '';
    quarterDropdown.innerHTML += `<option value="${q}" ${selected}>${q}</option>`;
  });

  // Khởi tạo dropdown năm từ dữ liệu thực
  if (token) {
    fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(json => {
      const years = [...new Set((json.data?.array || []).map(o => new Date(o.created_at).getFullYear()))].sort((a, b) => b - a);
      yearDropdown.innerHTML = '';
      years.forEach(y => {
        const selected = y === currentYear ? 'selected' : '';
        yearDropdown.innerHTML += `<option value="${y}" ${selected}>${y}</option>`;
      });

      // ✅ Gọi thống kê ngay sau khi đủ dữ liệu
      generateStatistics();
    });
  } else {
    yearDropdown.innerHTML = `<option value="${currentYear}" selected>${currentYear}</option>`;
    generateStatistics();
  }
});

function gotoLinkCoffeeStats() {
  resetChartButtons();
  validSkus = linkCoffeeSkus;
  generateStatistics();
}
async function gotoProductOrderStats() {
  resetChartButtons();
  const akiraSkus = await fetchAkiraSkus();
  validSkus = akiraSkus;
  generateStatistics();
}

function gotoComboStats() {
  resetChartButtons();
  validSkus = comboSkus;
  generateStatistics();
}



// Gọi khi nhấn nút "Cây Doanh Số"
async function gotoSalesTree() {
  // Ẩn các nút cũ
  document.getElementById("btn-sales").style.display = "none";
  document.getElementById("btn-revenue").style.display = "none";

  document.getElementById("salesTable").style.display = "none";
  document.getElementById("salesPagination").style.display = "none";

  document.getElementById("userTable").style.display = "table";
  document.getElementById("userPagination").style.display = "flex";

  document.getElementById("salesFilterInput").style.display = "none";
  document.getElementById("userFilterInput").style.display = "inline-block";

  document.getElementById("sortSelect").style.display = "none";
  document.getElementById("UsersortSelect").style.display = "inline-block";

 

  // Hiện các nút biểu đồ mới
  const btnTree = document.getElementById("btn-peronal");
  const btnSystem = document.getElementById("btn-revenueSystem");
  const btnTeam = document.getElementById("btn-revenueTeam");

  btnTree.style.display = "inline-block";
  btnSystem.style.display = "inline-block";
  btnTeam.style.display = "inline-block";

  // Đặt nút mặc định là biểu đồ cá nhân
  btnTree.classList.add("active");
  btnSystem.classList.remove("active");
  btnTeam.classList.remove("active");

  showChart("tree");

  const token = document.getElementById("token")?.value;
  if (!token) return alert("Thiếu token");

  try {
    const res = await fetch("https://dhtshop.vn/api/admin/getAllUsers?page=1&limit=50000", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();
    const users = json.data?.array || [];

    // ===== Danh số Cá nhân =====
    const personalSales = {};
    users
      .filter(u => u.revenuePersonal > 0)
      .sort((a, b) => b.revenuePersonal - a.revenuePersonal)
      .slice(0, 10)
      .forEach(u => {
        const name = u.full_name || u.email || u.phone || "Không xác định";
        personalSales[name] = { totalAmount: u.revenuePersonal };
      });
    renderTreeChart(personalSales);

    // ===== Danh số Hệ thống =====
    const systemSales = {};
    users
      .filter(u => u.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .forEach(u => {
        const name = u.full_name || u.email || u.phone || "Không xác định";
        systemSales[name] = { totalAmount: u.revenue };
      });
    renderRevenueSystemChart(systemSales);

    // ===== Danh số Đội nhóm =====
    renderRevenueTeamChart(users);

    // Thống kê tổng hợp
    updateRevenueSystemStats(users);
    document.getElementById("statistics").style.display = "none";
    document.getElementById("statisticsRevenue").style.display = "block";
   

  } catch (err) {
    console.error("Lỗi cây doanh số:", err);
    alert("Lỗi khi tải cây doanh số");
  }
}


function renderTreeChart(salesByPerson) {
  const topSales = Object.entries(salesByPerson)
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .slice(0, 10);

  const labels = topSales.map(([name]) => name);
  const data = topSales.map(([, d]) => d.totalAmount);

  const ctx = document.getElementById('treeChart').getContext('2d');

  if (window.treeChart?.destroy) window.treeChart.destroy();

  const formatCurrency = value =>
    value >= 1_000_000_000
      ? (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ'
      : (value / 1_000_000).toFixed(0) + ' triệu';

  window.treeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Doanh số cá nhân (VND)',
        data,
        backgroundColor: '#FF9800',
        borderColor: '#FF9800',
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const name = ctx.chart.data.labels[ctx.dataIndex];
              const value = ctx.raw.toLocaleString('vi-VN') + " VND";
              return `${name}: ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => formatCurrency(value)
          }
        }
      }
    }
  });
}

function resetChartButtons() {
  document.getElementById("btn-sales").style.display = "inline-block";
  document.getElementById("btn-revenue").style.display = "inline-block";
  document.getElementById("statistics").style.display = "grid";
  document.getElementById("btn-peronal").style.display = "none";
  document.getElementById("btn-revenueSystem").style.display = "none";
  document.getElementById("btn-revenueTeam").style.display = "none";
  document.getElementById("statisticsRevenue").style.display = "none";
    document.getElementById("salesTable").style.display = "table";
  document.getElementById("salesPagination").style.display = "flex";

  document.getElementById("userTable").style.display = "none";
  document.getElementById("userPagination").style.display = "none";

  document.getElementById("salesFilterInput").style.display = "inline-block";
  document.getElementById("userFilterInput").style.display = "none";

    document.getElementById("sortSelect").style.display = "inline-block";
  document.getElementById("UsersortSelect").style.display = "none";

}





// Gọi khi nhấn nút "Danh số hệ thống"
async function gotoRevenueSystem() {
  const token = document.getElementById("token")?.value;
  if (!token) return alert("Thiếu token");

  try {
    const res = await fetch("https://dhtshop.vn/api/admin/getAllUsers?page=1&limit=50000", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();
    const users = json.data?.array || [];

    const topUsers = users
      .filter(u => u.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const salesSystem = {};
    topUsers.forEach(u => {
      const name = u.full_name || u.email || u.phone || 'Không xác định';
      salesSystem[name] = { totalAmount: u.revenue };
    });

    renderRevenueSystemChart(salesSystem);
    showChart("revenueSystem");
  } catch (err) {
    console.error("Lỗi cây doanh số:", err);
    alert("Lỗi khi tải cây doanh số");
  }
}


function renderRevenueSystemChart(salesSystem) {
  const topSales = Object.entries(salesSystem)
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .slice(0, 10);

  const labels = topSales.map(([name]) => name);
  const data = topSales.map(([, d]) => d.totalAmount);

  const ctx = document.getElementById('revenueSystemChart').getContext('2d');

  if (window.revenueSystemChart?.destroy) window.revenueSystemChart.destroy();

  const formatCurrency = value =>
    value >= 1_000_000_000
      ? (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ'
      : (value / 1_000_000).toFixed(0) + ' triệu';

  window.revenueSystemChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Doanh số hệ thống (VND)',
        data,
        backgroundColor: '#388E3C',
        borderColor: '#388E3C',
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const name = ctx.chart.data.labels[ctx.dataIndex];
              const value = ctx.raw.toLocaleString('vi-VN') + " VND";
              return `${name}: ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => formatCurrency(value)
          }
        }
      }
    }
  });
}

function renderRevenueTeamChart(users) {
  const topUsers = [...users]
    .filter(u => u.revenueTeam > 0)
    .sort((a, b) => b.revenueTeam - a.revenueTeam)
    .slice(0, 10);

  const labels = topUsers.map(u => u.full_name || u.phone || 'Không tên');
  const data = topUsers.map(u => u.revenueTeam);

  const ctx = document.getElementById('revenueTeamChart').getContext('2d');

  if (window.revenueTeamChart?.destroy) window.revenueTeamChart.destroy();

  const formatCurrency = value =>
    value >= 1_000_000_000
      ? (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ'
      : (value / 1_000_000).toFixed(0) + ' triệu';

  window.revenueTeamChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Danh số đội nhóm (VND)',
        data,
        backgroundColor: '#3F51B5',
        borderColor: '#3F51B5',
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const name = ctx.chart.data.labels[ctx.dataIndex];
              const value = ctx.raw.toLocaleString('vi-VN') + " VND";
              return `${name}: ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => formatCurrency(value)
          }
        }
      }
    }
  });
}

function gotoRevenueTeamChart() {
  const token = document.getElementById("token")?.value;
  if (!token) return;

  fetch("https://dhtshop.vn/api/admin/getAllUsers?page=1&limit=50000", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(json => {
      const users = json.data?.array || [];
      renderRevenueTeamChart(users);
      showChart('revenueTeam');
    });
}


// // Tải file danh số cá nhân
async function downloadPersonalRevenueCSV() {
  const token = document.getElementById("token")?.value;
  if (!token) return alert("Thiếu token");

  try {
    const res = await fetch("https://dhtshop.vn/api/admin/getAllUsers?page=1&limit=50000", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const json = await res.json();
    const users = json.data?.array || [];

    const filtered = users.filter(u => (u.maxOut || 0) > 0);

    const headers = ["STT", "Họ và tên", "Số điện thoại", "Maxout (VND)"];
    const rows = filtered.map((u, idx) => [
      idx + 1,
      u.full_name || "",
      u.phone || "",
      Math.round(u.maxOut || 0).toLocaleString("vi-VN")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(f => `"${String(f).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "danh_sach_maxout.csv";
    a.click();
  } catch (err) {
    console.error("Lỗi khi tải danh sách maxout:", err);
    alert("Không thể xuất danh sách maxout.");
  }
}

async function downloadMaxoutCSV() {
  const token = document.getElementById("token")?.value;
  if (!token) return alert("Thiếu token");

  try {
    const res = await fetch("https://dhtshop.vn/api/admin/getAllUsers?page=1&limit=50000", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const json = await res.json();
    const users = json.data?.array || [];

    const filtered = users.filter(u => (u.maxOut || 0) > 0);

    const headers = ["STT", "Họ và tên", "Số điện thoại", "Maxout (VND)"];
    const rows = filtered.map((u, idx) => [
      idx + 1,
      u.full_name || "",
      u.phone || "",
      Math.round(u.maxOut || 0).toLocaleString("vi-VN")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(f => `"${String(f).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "danh_sach_maxout.csv";
    a.click();
  } catch (err) {
    console.error("Lỗi khi tải danh sách maxout:", err);
    alert("Không thể xuất danh sách maxout.");
  }
}


async function fetchAndUpdateRevenueSystemStats() {
  const token = document.getElementById("token")?.value;
  if (!token) return alert("Thiếu token");

  try {
    const res = await fetch("https://dhtshop.vn/api/admin/getAllUsers?page=1&limit=50000", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const json = await res.json();
    const users = json.data?.array || [];

    updateRevenueSystemStats(users);

   
  } catch (err) {
    console.error("Lỗi khi tải danh sách người dùng:", err);
    alert("Không thể lấy dữ liệu thống kê.");
  }
}

function updateRevenueSystemStats(users) {
  const totalAccounts = users.length;

  const totalPersonalRevenueRaw = users.reduce((sum, u) => sum + (u.revenuePersonal || 0), 0);
  const totalPersonalRevenue = Math.round(totalPersonalRevenueRaw); // ✅ Làm tròn tổng cuối cùng

  const activeAccounts = users.filter(u => (u.revenuePersonal || 0) > 0);
  const activeRate = totalAccounts > 0
    ? Math.round((activeAccounts.length / totalAccounts) * 100)
    : 0;

  const above50M = users.filter(u => (u.revenuePersonal || 0) >= 50000000).length;
  const multiLevelUsers = users.filter(u => (u.priority || 0) >= 2).length;

  const totalMaxoutRaw = users.reduce((sum, u) => sum + (u.maxOut || 0), 0);
  const totalMaxout = Math.round(totalMaxoutRaw); // ✅ Làm tròn tổng cuối cùng


  document.getElementById("totalPersonalRevenue").textContent =
    totalPersonalRevenue.toLocaleString('vi-VN') + " VND";

  document.getElementById("totalAccounts").textContent = totalAccounts + " Tài Khoản";

  document.getElementById("activeTransactionRate").textContent = `${activeRate}%`;
  document.getElementById("activeTransactionInfo").textContent =
    `(${activeAccounts.length}/${totalAccounts})`;

  document.getElementById("above50PercentPersonal").textContent =
    above50M + " Tài Khoản";

  document.getElementById("multiLevelUsers").textContent =
    multiLevelUsers + " Tài Khoản";

  document.getElementById("totalMaxout").textContent =
    totalMaxout.toLocaleString('vi-VN') + " VND";
}

async function loadUserTable() {
  const token = document.getElementById("token")?.value;
  if (!token) {
    alert("Vui lòng nhập token!");
    return;
  }

  const tableBody = document.querySelector("#userTable tbody");
  const pagination = document.getElementById("userPagination");
  tableBody.innerHTML = '<tr><td colspan="11">Đang tải...</td></tr>';

  try {
    const res = await fetch("https://dhtshop.vn/api/admin/getAllUsers?page=1&limit=50000", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await res.json();
    const users = json.data?.array || [];
    

    if (!users.length) {
      tableBody.innerHTML = '<tr><td colspan="11">Không có dữ liệu</td></tr>';
      return;
    }

    const pageSize = 10;
    let currentPage = 1;

    const renderPage = (page) => {
      currentPage = page;
      tableBody.innerHTML = '';
      const start = (page - 1) * pageSize;
      const pageItems = users.slice(start, start + pageSize);

      pageItems.forEach((u, idx) => {
        const row = tableBody.insertRow();
        row.innerHTML = `
          <td>${start + idx + 1}</td>
          <td>${u.phone || ""}</td>
          <td>${u.full_name || ""}</td>
          <td>${u.refBy || ""}</td>
          <td>${u.level ?? ""}</td>
          <td>${u.f1Count ?? ""}</td>
          <td>${u.priority ?? ""}</td>
           <td>${(u.revenue ?? 0).toLocaleString('vi-VN')} VND</td>
    <td>${(u.revenueTeam ?? 0).toLocaleString('vi-VN')} VND</td>
    <td>${(u.revenuePersonal ?? 0).toLocaleString('vi-VN')} VND</td>
    <td>${(u.maxOut ?? 0).toLocaleString('vi-VN')} VND</td>
        `;
      });
      window.allUsers = users;
      renderPagination();
    };

    const renderPagination = () => {
      const totalPages = Math.ceil(users.length / pageSize);
      pagination.innerHTML = '';

      // Nút Trang trước
      const prevBtn = document.createElement("button");
      prevBtn.textContent = "Trang trước";
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => renderPage(currentPage - 1);
      pagination.appendChild(prevBtn);

      const createBtn = (page, text = page) => {
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.disabled = page === currentPage;
        btn.onclick = () => renderPage(page);
        pagination.appendChild(btn);
      };

      if (totalPages <= 6) {
        for (let i = 1; i <= totalPages; i++) createBtn(i);
      } else {
        createBtn(1);
        if (currentPage > 3) {
          const span = document.createElement("span");
          span.textContent = "...";
          pagination.appendChild(span);
        }
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 3) end = 4;
        if (currentPage >= totalPages - 2) start = totalPages - 3;

        for (let i = start; i <= end; i++) {
          if (i > 1 && i < totalPages) createBtn(i);
        }

        if (currentPage < totalPages - 2) {
          const span = document.createElement("span");
          span.textContent = "...";
          pagination.appendChild(span);
        }
        createBtn(totalPages);
      }

      // Nút Trang sau
      const nextBtn = document.createElement("button");
      nextBtn.textContent = "Trang sau";
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => renderPage(currentPage + 1);
      pagination.appendChild(nextBtn);
    };

    renderPage(currentPage);
    

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="11">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}
document.addEventListener("DOMContentLoaded", loadUserTable);

// Tải table User

function downloadAllUsersAsCSV() {
  const users = window.allUsers || [];
  if (!users.length) {
    alert("Không có dữ liệu để tải xuống.");
    return;
  }
  const headers = [
    "STT", "Số điện thoại", "Họ và tên", "RefBy", "Level", "F1 Count",
    "Priority", "Doanh số hệ thống", "Doanh số đội nhóm", "Doanh số cá nhân", "MaxOut"
  ];
  const rows = users.map((u, idx) => [
    idx + 1,
    u.phone || "",
    u.full_name || "",
    u.refBy || "",
    u.level ?? "",
    u.f1Count ?? "",
    u.priority ?? "",
    u.revenue ?? 0,
    u.revenueTeam ?? 0,
    u.revenuePersonal ?? 0,
    u.maxOut ?? 0
  ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows
  ].join("\n");
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const urlBlob = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = urlBlob;
  link.download = `user_table_all_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}


function updateUserTable() {
  const keyword = document.getElementById("userFilterInput").value.trim().toLowerCase();
  const sortSelect = document.getElementById("UsersortSelect");
  const sortValue = sortSelect ? sortSelect.selectedIndex : 0;

  let filtered = window.allUsers || [];
  if (keyword) {
    filtered = filtered.filter(user => {
      const name = (user.full_name || "").toLowerCase();
      const phone = (user.phone || "").toLowerCase();
      const refBy = (user.refBy || "").toLowerCase();
      return name.includes(keyword) || phone.includes(keyword) || refBy.includes(keyword);
    });
  }

  // Sắp xếp theo lựa chọn của user
  filtered.sort((a, b) => {
    switch (sortValue) {
      case 1: // F1 Count
        return (b.f1Count || 0) - (a.f1Count || 0);
      case 2: // Độ ưu tiên
        return (b.priority || 0) - (a.priority || 0);
      case 3: // DS hệ thống
        return (b.revenue || 0) - (a.revenue || 0);
      case 4: // DS đội nhóm
        return (b.revenueTeam || 0) - (a.revenueTeam || 0);
      case 5: // DS cá nhân
        return (b.revenuePersonal || 0) - (a.revenuePersonal || 0);
      case 6: // Maxout
        return (b.maxOut || 0) - (a.maxOut || 0);
      case 0: // Level (LV)
      default:
        return (b.level || 0) - (a.level || 0);
    }
  });

  window.filteredUsers = filtered;
  renderUserTable(filtered, 1);
}


function renderUserTable(users, page = 1) {
  const tableBody = document.querySelector("#userTable tbody");
  const pagination = document.getElementById("userPagination");
  const pageSize = 10;
  const totalPages = Math.ceil(users.length / pageSize);
  let currentPage = Math.max(1, Math.min(page, totalPages || 1));
  tableBody.innerHTML = '';

  const start = (currentPage - 1) * pageSize;
  const pageItems = users.slice(start, start + pageSize);

  pageItems.forEach((u, idx) => {
    const row = tableBody.insertRow();
    row.innerHTML = `
      <td>${start + idx + 1}</td>
      <td>${u.phone || ""}</td>
      <td>${u.full_name || ""}</td>
      <td>${u.refBy || ""}</td>
      <td>${u.level ?? ""}</td>
      <td>${u.f1Count ?? ""}</td>
      <td>${u.priority ?? ""}</td>
        <td>${(u.revenue ?? 0).toLocaleString('vi-VN')} VND</td>
    <td>${(u.revenueTeam ?? 0).toLocaleString('vi-VN')} VND</td>
    <td>${(u.revenuePersonal ?? 0).toLocaleString('vi-VN')} VND</td>
    <td>${(u.maxOut ?? 0).toLocaleString('vi-VN')} VND</td>
    `;
  });

  // Render pagination (dạng rút gọn 6 ô như code cũ của bạn)
  pagination.innerHTML = '';
  if (totalPages > 1) {
    // Trang trước
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Trang trước";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => renderUserTable(users, currentPage - 1);
    pagination.appendChild(prevBtn);

    const createBtn = (p, label = p) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.disabled = p === currentPage;
      btn.onclick = () => renderUserTable(users, p);
      pagination.appendChild(btn);
    };

    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) createBtn(i);
    } else {
      createBtn(1);
      if (currentPage > 3) {
        const span = document.createElement("span");
        span.textContent = "...";
        pagination.appendChild(span);
      }
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) end = 4;
      if (currentPage >= totalPages - 2) start = totalPages - 3;

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) createBtn(i);
      }

      if (currentPage < totalPages - 2) {
        const span = document.createElement("span");
        span.textContent = "...";
        pagination.appendChild(span);
      }
      createBtn(totalPages);
    }

    // Trang sau
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Trang sau";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => renderUserTable(users, currentPage + 1);
    pagination.appendChild(nextBtn);
  }
}
document.getElementById("userFilterInput").addEventListener("input", updateUserTable);
document.getElementById("UsersortSelect").addEventListener("change", updateUserTable);

function setActiveMenu(button) {
  // Xóa active ở mọi nút
  document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
  // Gán active cho nút vừa bấm
  button.classList.add('active');
}

// Tải đơn

async function downloadComboCSV() {
  await downloadOrderCSV(comboSkus, "combo");
}

async function downloadLinkcoffeeCSV() {
  await downloadOrderCSV(linkCoffeeSkus, "linkcoffee");
}

async function downloadAkiraCSV() {
  const akiraSkus = await fetchAkiraSkus();
  await downloadOrderCSV(akiraSkus, "akira");
}

async function downloadOrderCSV(validSkus, type) {
  const token = document.getElementById("token").value;
  if (!token) return alert("Vui lòng nhập token!");

  try {
    const res = await fetch("https://dhtshop.vn/api/admin/orders?page=1&limit=50000&status=all", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const json = await res.json();
    const orders = json.data?.array || [];

    const filteredOrders = orders.filter(order => {
      const cart = JSON.parse(order.cartSnapshot || "[]");
      return cart.some(product => validSkus.includes(product.productDetail?.sku));
    });

    const headers = [
      "STT", "Mã đơn hàng", "Trạng thái", "Loại thanh toán", "Tổng tiền",
      "Người duyệt",  "Họ và tên", "Tên sản phẩm", 
      "Tổng số lượng sản phẩm", "Địa chỉ", "SĐT", "Ghi chú", "Ngày mua hàng"
    ];

    const rows = filteredOrders.map((item, idx) => {
      const cart = JSON.parse(item.cartSnapshot || "[]");
      let adminData = {};
      try {
        adminData = JSON.parse(item.admin || "{}");
      } catch {}

      // Tính tổng số lượng của tất cả sản phẩm trong đơn
      const totalQuantity = cart.reduce((sum, product) => {
        // Kiểm tra nếu quantity hợp lệ
        const quantity = product.quantity || 0;
        if (quantity <= 0 || quantity > 1000) {
          console.warn(`Số lượng không hợp lệ cho sản phẩm ${product.productDetail?.name}: ${quantity}`);
          return sum;  // Bỏ qua số lượng không hợp lệ
        }
        return sum + quantity;
      }, 0);

      // Làm sạch cột "Số lượng" để bỏ định dạng và chỉ lấy số nguyên
      const quantities = cart.map(product => {
        const quantity = product.quantity || 0;
        return quantity.toString().replace(/[^0-9]/g, '');  // Loại bỏ ký tự không phải là số
      }).join(", ");  // Nối các số lượng sản phẩm lại với nhau nếu có nhiều sản phẩm trong đơn

      const totalAmount = item.totalAmount || 0;

      return [
        idx + 1,
        item.orderId || "",
        item.status || "",
        item.walletName || "",
        totalAmount,
        adminData.full_name || "",
        
        item.userFullName || "",
        cart.map(product => product.productDetail?.name).join(", "), // Tên sản phẩm
       
        totalQuantity,  // Tổng số lượng của tất cả sản phẩm trong đơn
        item.orderAddress || "",
        item.orderPhone || "",
        item.orderNote || "",
        new Date(item.created_at).toLocaleString('vi-VN')
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(field => `"${String(field).replace(/\"/g, '\"\"')}"`).join(","))
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${type}_${Date.now()}.csv`;
    a.click();
  } catch (err) {
    alert("Lỗi tải đơn hàng: " + err.message);
  }
}



let is24Hour = false;  // Mặc định là 12 giờ

function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  let ampm = '';
  if (!is24Hour) {
    ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
  }

  const hoursStr = String(hours).padStart(2, "0");
  document.getElementById("clock").textContent = `${hoursStr}:${minutes}:${seconds}`;
  document.getElementById("ampm").textContent = is24Hour ? '' : ampm;

   // Cập nhật ngày
  const day = now.getDate();
  const month = now.getMonth() + 1; // Tháng bắt đầu từ 0, cộng thêm 1 để đúng
  const year = now.getFullYear();
  const dateStr = `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${year}`;
  document.getElementById("date").textContent = dateStr;
}

setInterval(updateClock, 1000);
updateClock();  // Hiển thị giờ ngay lập tức khi tải trang


// Lưu token vào cookie với các thuộc tính bảo mật
function setTokenInCookie(token) {
  const expiryDate = new Date();
  expiryDate.setSeconds(expiryDate.getSeconds() + 3600); // Token hết hạn sau 1 giờ
  document.cookie = `dht_token=${token};expires=${expiryDate.toUTCString()};path=/;Secure;HttpOnly;SameSite=Strict`;
}

// Lấy token từ cookie
function getTokenFromCookie() {
  const match = document.cookie.match(/(^| )dht_token=([^;]+)/);
  return match ? match[2] : null;
}

// Xóa token khỏi cookie
function clearTokenFromCookie() {
  document.cookie = "dht_token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
}
async function fetchWithCSRF(url, options = {}) {
  const csrfToken = getCsrfToken();  // Giả sử bạn có hàm này để lấy CSRF token
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${getTokenFromCookie()}`,
      'X-CSRF-Token': csrfToken,  // Thêm CSRF token vào header
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options.body),
  });
  return response.json();
}
function verifyCsrfToken(req, res, next) {
  const csrfToken = req.headers['x-csrf-token'];
  if (csrfToken !== req.session.csrfToken) {  // Kiểm tra CSRF token với server
    return res.status(403).send('CSRF token không hợp lệ.');
  }
  next();
}
// Sử dụng thư viện DOMPurify để sanitize dữ liệu đầu vào
function sanitizeInput(input) {
  return DOMPurify.sanitize(input);
}

// Sử dụng sanitize trong mã của bạn
const sanitizedInput = sanitizeInput(document.getElementById("inputField").value);
function authorize(allowedScopes) {
  return (req, res, next) => {
    const userScopes = req.user.scopes;
    if (allowedScopes.some(scope => userScopes.includes(scope))) {
      next();
    } else {
      res.status(403).send('Bạn không có quyền truy cập vào tài nguyên này.');
    }
  };
}
