import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { Task } from "../models/task.model.js";
import { Ca } from "../models/ca.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { CatchAsyncErrror } from "../middleware/catchAsyncError.js";

// Get dashboard data based on user role
export const getDashboardData = CatchAsyncErrror(
  async (req, res, next) => {
    try {
      const userId = req.user?._id;
      const user = await User.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      let dashboardData = {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullname: user.fullname,
          role: user.role,
          profilePicture: user.profilePicture,
          score: user.score,
          isIITPStud: user.isIITPStud,
          collegeName: user.collegeName,
          rollNo: user.rollNo,
          PORs: user.PORs,
        },
        stats: {},
        recentActivities: [],
      };

      // Role-based data fetching
      switch (user.role) {
        case "admin":
          dashboardData = await getAdminDashboard(dashboardData);
          break;
        case "moderator":
          dashboardData = await getModeratorDashboard(dashboardData);
          break;
        case "ca":
          dashboardData = await getCADashboard(dashboardData, userId);
          break;
        case "user":
        default:
          dashboardData = await getUserDashboard(dashboardData, userId);
          break;
      }

      res.status(200).json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Admin Dashboard Data
const getAdminDashboard = async (dashboardData) => {
  const totalUsers = await User.countDocuments();
  const totalStudents = await User.countDocuments({ role: "user" });
  const totalModerators = await User.countDocuments({ role: "moderator" });
  const totalCAs = await User.countDocuments({ role: "ca" });
  const iitpStudents = await User.countDocuments({ isIITPStud: true });

  // Task statistics
  const totalTasks = await Task.countDocuments();
  const recentTasks = await Task.find()
    .sort({ assignedAt: -1 })
    .limit(5)
    .populate("assignedBy", "fullname username");

  // Recent registrations (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentUsers = await User.find({
    createdAt: { $gte: sevenDaysAgo }
  }).sort({ createdAt: -1 }).limit(5);

  // Top scoring users
  const topScorers = await User.find({ role: "user" })
    .sort({ score: -1 })
    .limit(5)
    .select("username fullname score profilePicture");

  // CA application stats
  const pendingCAApplications = await Ca.countDocuments({ status: "pending" });
  const acceptedCAApplications = await Ca.countDocuments({ status: "accepted" });

  dashboardData.stats = {
    totalUsers,
    totalStudents,
    totalModerators,
    totalCAs,
    iitpStudents,
    totalTasks,
    pendingCAApplications,
    acceptedCAApplications,
    recentRegistrations: recentUsers.length,
  };

  // Combine recent activities
  const activities = [];
  
  // Add recent user registrations
  recentUsers.forEach(user => {
    activities.push({
      type: "user_registration",
      message: `${user.fullname} registered`,
      timestamp: user.createdAt,
    });
  });

  // Add recent task assignments
  recentTasks.forEach(task => {
    activities.push({
      type: "task_assigned",
      message: `Task "${task.title}" assigned by ${task.assignedBy.fullname}`,
      timestamp: task.assignedAt,
    });
  });

  // Sort activities by timestamp
  dashboardData.recentActivities = activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  dashboardData.topScorers = topScorers;
  dashboardData.recentTasks = recentTasks;

  return dashboardData;
};

// Moderator Dashboard Data
const getModeratorDashboard = async (dashboardData) => {
  const totalUsers = await User.countDocuments({ role: "user" });
  const totalStudents = await User.countDocuments({ role: "user" });
  const iitpStudents = await User.countDocuments({ isIITPStud: true });
  const totalCAs = await User.countDocuments({ role: "ca" });
  
  // Task statistics
  const totalTasks = await Task.countDocuments();
  const recentTasks = await Task.find()
    .sort({ assignedAt: -1 })
    .limit(5)
    .populate("assignedBy", "fullname username");

  // CA applications for review
  const pendingCAApplications = await Ca.find({ status: "pending" })
    .populate("userId", "fullname username collegeName")
    .sort({ applicationDate: -1 })
    .limit(5);
  
  // Recent users
  const recentUsers = await User.find({ role: "user" })
    .sort({ createdAt: -1 })
    .limit(5);

  dashboardData.stats = {
    totalUsers,
    totalStudents,
    totalCAs,
    iitpStudents,
    totalTasks,
    pendingCAApplications: pendingCAApplications.length,
    managedUsers: totalUsers,
  };

  // Combine recent activities
  const activities = [];
  
  // Add recent user activities
  recentUsers.forEach(user => {
    activities.push({
      type: "user_activity",
      message: `${user.fullname} (Score: ${user.score})`,
      timestamp: user.updatedAt,
    });
  });

  // Add recent task activities
  recentTasks.forEach(task => {
    activities.push({
      type: "task_activity",
      message: `Task "${task.title}" assigned`,
      timestamp: task.assignedAt,
    });
  });

  dashboardData.recentActivities = activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  dashboardData.pendingCAApplications = pendingCAApplications;
  dashboardData.recentTasks = recentTasks;

  return dashboardData;
};

// CA Dashboard Data -- seperate one
const getCADashboard = async (dashboardData, userId) => {
  const user = await User.findById(userId);
  
  // Get CA's assigned tasks
  const assignedTasks = await Task.find({ assignedBy: userId })
    .sort({ assignedAt: -1 })
    .limit(10);

  // Get CA application info
  const caApplication = await Ca.findOne({ userId })
    .populate("reviewedBy", "fullname username");

  // we can add completion tracking in future, like here placeholder
  const completedTasks = 0; 
  
  // Calculate task-related stats
  const totalTasksAssigned = assignedTasks.length;
  const upcomingTasks = assignedTasks.filter(task => 
    task.dueDate && new Date(task.dueDate) > new Date()
  ).length;

  dashboardData.stats = {
    currentScore: user?.score || 0,
    totalTasksAssigned,
    completedTasks,
    upcomingTasks,
    applicationStatus: caApplication?.status || "not_applied",
    responsibilities: user?.PORs || [],
    collegeName: user?.collegeName || "Not specified",
    rollNo: user?.rollNo || "Not specified",
  };

  // Recent activities based on assigned tasks
  const activities = assignedTasks.length > 0 
    ? assignedTasks.map(task => ({
        type: "task_assigned",
        message: `Assigned task: "${task.title}"`,
        timestamp: task.assignedAt,
      }))
    : [
        {
          type: "ca_welcome",
          message: "Welcome to CA Dashboard - Start assigning tasks to engage with your college community!",
          timestamp: new Date(),
        }
      ];

  dashboardData.recentActivities = activities.slice(0, 5);
  dashboardData.assignedTasks = assignedTasks;
  dashboardData.caApplication = caApplication;

  return dashboardData;
};

// User Dashboard Data except CA
const getUserDashboard = async (dashboardData, userId) => {
  const user = await User.findById(userId);
  
  // Get user's task completion stats (placeholder for future implementation)
  const completedTasks = 0;
  const availableTasks = await Task.countDocuments();

  // Get recent tasks that might be relevant to the user
  const recentTasks = await Task.find()
    .sort({ assignedAt: -1 })
    .limit(5)
    .populate("assignedBy", "fullname username");

  dashboardData.stats = {
    currentScore: user?.score || 0,
    completedTasks,
    availableTasks,
    collegeName: user?.collegeName || "Not specified",
    rollNo: user?.rollNo || "Not specified",
    rank: 0, // Placeholder for ranking system
  };

  // Recent activities
  const activities = recentTasks.length > 0 
    ? recentTasks.map(task => ({
        type: "task_available",
        message: `New task available: "${task.title}"`,
        timestamp: task.assignedAt,
      }))
    : [
        {
          type: "welcome",
          message: "Welcome to your dashboard! Start participating in tasks to earn points.",
          timestamp: new Date(),
        }
      ];

  dashboardData.recentActivities = activities.slice(0, 5);
  dashboardData.availableTasks = recentTasks;

  return dashboardData;
};

// Get user profile
export const getUserProfile = CatchAsyncErrror(
  async (req, res, next) => {
    try {
      const userId = req.user?._id;
      const user = await User.findById(userId).select("-password -refreshToken");

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      res.status(200).json({
        success: true,
        user: user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Change password
export const changePassword = CatchAsyncErrror(
  async (req, res, next) => {
    try {
      const userId = req.user?._id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return next(new ErrorHandler("Current password and new password are required", 400));
      }

      if (newPassword.length < 6) {
        return next(new ErrorHandler("New password must be at least 6 characters long", 400));
      }

      const user = await User.findById(userId).select("+password");
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return next(new ErrorHandler("Current password is incorrect", 400));
      }

      // Check if new password is different from current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return next(new ErrorHandler("New password must be different from current password", 400));
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await User.findByIdAndUpdate(userId, {
        password: hashedNewPassword,
        updatedAt: new Date(),
      });

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Update profile
export const updateProfile = CatchAsyncErrror(
  async (req, res, next) => {
    try {
      const userId = req.user?._id;
      const { fullname, collegeName, rollNo, PORs } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      // Update only provided fields
      const updateData = {
        updatedAt: new Date(),
      };

      if (fullname) updateData.fullname = fullname;
      if (collegeName) updateData.collegeName = collegeName;
      if (rollNo) updateData.rollNo = rollNo;
      if (PORs) updateData.PORs = PORs;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      ).select("-password -refreshToken");

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);