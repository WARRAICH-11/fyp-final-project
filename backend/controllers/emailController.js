const nodemailer = require('nodemailer');
const User = require('../models/User');

// Configure email transporter
// Note: For production, use actual SMTP credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // or any other service
  auth: {
    user: 'careerlabs.noreply@gmail.com', // replace with your email
    pass: 'your_app_password_here'        // replace with app password
  }
});

/**
 * Send career recommendation report via email
 * @route POST /api/careers/email-results
 */
const sendCareerReport = async (req, res) => {
  try {
    const { email, subject, userName, results, userId } = req.body;

    // Validate required fields
    if (!email || !results || !results.recommendations) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // If userId is provided, try to find user in database
    let user = null;
    if (userId) {
      user = await User.findById(userId).select('name email');
    }

    // Create HTML content for email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Career Recommendation Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
          .header { background-color: #4a6cf7; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
          .recommendation { background-color: #f9f9f9; border-left: 4px solid #4a6cf7; margin-bottom: 15px; padding: 15px; }
          .score { color: #4a6cf7; font-weight: bold; }
          h3 { color: #4a6cf7; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .skill-tag { display: inline-block; background-color: #e9ecef; padding: 4px 8px; margin: 4px; border-radius: 4px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Career Labs</h1>
          <h2>Your Career Recommendation Report</h2>
        </div>
        
        <div class="content">
          <p>Dear ${userName || user?.name || 'Valued User'},</p>
          
          <p>Thank you for using Career Labs! Based on your profile, we've prepared the following career recommendations for you:</p>
          
          <h3>Top Career Recommendations</h3>
          
          ${results.recommendations.map((career, index) => `
            <div class="recommendation">
              <h4>${index + 1}. ${career.title}</h4>
              <p><strong>Match:</strong> <span class="score">${career.match_level} (${career.confidence_score}%)</span></p>
              <p><strong>Market Growth:</strong> ${career.market_growth}</p>
              <p><strong>Salary Range:</strong> ${career.salary_range}</p>
              
              <p><strong>Required Skills:</strong></p>
              <div>
                ${career.required_skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
              </div>
              
              <p><strong>Development Plan:</strong></p>
              <p>Short-term: ${career.development_plan.short_term}</p>
              <p>Long-term: ${career.development_plan.long_term || 'Continue building expertise in your field.'}</p>
            </div>
          `).join('')}
          
          <h3>Next Steps</h3>
          <p>To make the most of this recommendation:</p>
          <ol>
            <li>Review the skills needed for your preferred career paths</li>
            <li>Create a learning plan to develop those skills</li>
            <li>Explore job opportunities in these fields</li>
            <li>Consider connecting with professionals in these industries</li>
          </ol>
          
          <p>Log in to your Career Labs account to access more detailed information and resources.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated email from Career Labs. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Career Labs. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    // Configure email options
    const mailOptions = {
      from: '"Career Labs" <careerlabs.noreply@gmail.com>',
      to: email,
      subject: subject || 'Your Career Recommendations Report from Career Labs',
      html: htmlContent
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Career report sent successfully'
    });

  } catch (error) {
    console.error('Error sending career report email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error.message
    });
  }
};

module.exports = { sendCareerReport };
