require("dotenv").config(); 
const mongoose = require("mongoose");
const express = require('express');
const bcrypt = require('bcrypt');
const saltrounds = 10;
const session = require('express-session');
const { User,SeniorCitizen,Barangay ,PWD,Youth } = require("../model/schema");
const axios = require('axios');
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require('pdf-lib');


exports.createUser = async (req, res) => {
    try {
        const { name, email, password, confirm_password, role } = req.body;

        console.log(name, email, password, confirm_password, role);
        if (!name || !email || !password || !confirm_password || role=="user") {
            return res.status(400).json({ 
                success: false,
                error: "All fields are required" 
            });
        }
     

        if (password !== confirm_password) {
            return res.status(400).json({ 
                success: false,
                error: "Passwords do not match" 
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                error: "Email already exists" 
            });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, saltrounds);

        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword, // Store the hashed password
            role,
            status: "Active" // Default status
        });
        
        await newUser.save();

        // For security, don't return the hashed password in the response
        const userToReturn = { ...newUser._doc };
        delete userToReturn.password;

        res.status(201).json({ 
            success: true,
            message: "User created successfully", 
            user: userToReturn 
        });
    } catch (err) {
        res.status(400).json({ 
            success: false,
            error: err.message 
        });
    }
};

exports.login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "All fields are required",
        });
      }
  
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      if (user.status !== "Active") {
      return res.status(403).json({
        success: false,
        error: "Account is not active. Please contact the administrator.",
      });
    }
  
      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }
  
      // Store user data in session (excluding password)
      req.session.user = {
        _id: user._id,
        email: user.email,
        role: user.role,  // Ensure 'role' exists in your database
    };
    
      // Successful login response
      if (user.role === "Admin") {
        return res.redirect("/index");
    } else if (user.role === "Staff") {
        return res.redirect("/Pwd-form");
    }else if (user.role === "Super Admin") {
        return res.redirect("/index-superadmin");
    }else if (user.role === "Youth") {
        return res.redirect("/index-youth");
    }else {
        return res.redirect("/index"); // Default redirection
    }
  
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
}

exports.logout = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.redirect('/'); // Still redirect to root even on error
      }
      res.clearCookie('connect.sid'); // Clear the session cookie
      res.redirect('/'); // Explicit redirect to homepage
    });
  };


  //senior citizen form
  exports.createResident = async (req, res) => {
    console.log('Raw body:', req.body);
  
    try {
      const body = req.body;
  
      // Handle skill_other_text safely
      const skillOtherText = Array.isArray(body.education_hr_profile?.skill_other_text)
        ? body.education_hr_profile.skill_other_text.find(text => text && text.trim() !== '')
        : body.education_hr_profile?.skill_other_text;
  
      // Support both nested `identifying_information` payloads and flat form fields
      const rawPlace = body.identifying_information?.place_of_birth || body.place_of_birth;
      const rawReligion = body.identifying_information?.religion || body.religion;

      const residentData = {
        identifying_information: {
          name: {
            first_name: body.identifying_information?.name?.first_name || body.first_name,
            middle_name: body.identifying_information?.name?.middle_name || body.middle_name,
            last_name: body.identifying_information?.name?.last_name || body.last_name
          },
          address: {
            barangay: body.identifying_information?.address?.barangay || body.barangay,
            purok: body.identifying_information?.address?.purok || body.purok
          },
          date_of_birth: body.identifying_information?.date_of_birth || body.birthday || body.date_of_birth,
          age: parseInt(body.identifying_information?.age || body.age) || 0,
          place_of_birth: Array.isArray(rawPlace)
            ? rawPlace.filter(Boolean)
            : [rawPlace].filter(Boolean),
          religion: Array.isArray(rawReligion)
            ? rawReligion.filter(Boolean)
            : (rawReligion ? [rawReligion] : []),
          marital_status: body.identifying_information?.marital_status || body.marital_status || body.civil_status,
          gender: body.identifying_information?.gender || body.gender,
          contacts: Array.isArray(body.identifying_information?.contacts)
            ? body.identifying_information.contacts.filter(c => c?.name)
            : Array.isArray(body.contacts)
              ? body.contacts.filter(c => c?.name)
              : (body.contacts ? [body.contacts].filter(c => c?.name) : []),
          osca_id_number: body.identifying_information?.osca_id_number || body.osca_id,
          gsis_sss: body.identifying_information?.gsis_sss || body.gsis_sss_no || body.gsis_sss,
          philhealth: body.identifying_information?.philhealth || body.philhealth_no || body.philhealth,
          sc_association_org_id_no: body.identifying_information?.sc_association_org_id_no || body.sc_association_id,
          tin: body.identifying_information?.tin || body.tin_no || body.tin,
          other_govt_id: body.identifying_information?.other_govt_id || body.other_govt_id,
          service_business_employment: body.identifying_information?.service_business_employment || body.service || body.service_business_employment,
          current_pension: body.identifying_information?.current_pension || body.pension || body.current_pension,
          capability_to_travel: (body.identifying_information?.capability_to_travel || body.capability_to_travel) === 'Yes' ? 'Yes' : 'No'
        },
        family_composition: {
          spouse: {
            name: body.family_composition?.spouse?.name || undefined
          },
          father: {
            last_name: body.family_composition?.father?.last_name,
            first_name: body.family_composition?.father?.first_name,
            middle_name: body.family_composition?.father?.middle_name,
            extension: body.family_composition?.father?.extension || undefined
          },
          mother: {
            last_name: body.family_composition?.mother?.last_name,
            first_name: body.family_composition?.mother?.first_name,
            middle_name: body.family_composition?.mother?.middle_name
          },
          children: Array.isArray(body.family_composition?.children)
            ? body.family_composition.children
                .map(child => ({
                  full_name: child?.full_name || undefined,
                  occupation: child?.occupation || undefined,
                  age: parseInt(child?.age) || undefined,
                  working_status: child?.working_status || undefined,
                  income: child?.income || undefined
                }))
                .filter(child => child.full_name)
            : []
        },
        education_hr_profile: {
          educational_attainment: Array.isArray(body.education_hr_profile?.educational_attainment)
            ? body.education_hr_profile.educational_attainment.filter(Boolean)
            : [body.education_hr_profile?.educational_attainment].filter(Boolean),
          skills: Array.isArray(body.education_hr_profile?.skills)
            ? body.education_hr_profile.skills.filter(Boolean)
            : [],
          skill_other_text: skillOtherText || undefined
        },
        community_service: Array.isArray(body.community_service)
          ? body.community_service.filter(Boolean)
          : [],
        community_service_other_text: body.community_service_other_text || undefined
      };
  
      const newResident = new SeniorCitizen(residentData);
      const savedResident = await newResident.save();
  
      res.status(201).json({
        success: true,
        alert: {
          title: 'Success!',
          text: 'Senior citizen record created successfully',
          icon: 'success',
          showConfirmButton: false,
          timer: 3000
        },
        data: savedResident,
        reference_code: savedResident.reference_code
      });
  
    } catch (error) {
      console.error('Error creating resident:', error);
  
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          alert: {
            title: 'Validation Error',
            text: 'Please check your input fields',
            icon: 'error',
            showConfirmButton: true
          },
          errors
        });
      }
  
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          alert: {
            title: 'Duplicate Entry',
            text: `The ${field} already exists in our records`,
            icon: 'error',
            showConfirmButton: true
          },
          field,
          value: error.keyValue[field]
        });
      }
  
      res.status(500).json({
        success: false,
        alert: {
          title: 'Error',
          text: 'An unexpected error occurred',
          icon: 'error',
          showConfirmButton: true
        },
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  };


exports.registerPwd = async (req, res) => {
  try {
    console.log('Raw body:', req.body);

    // Transform the raw data to match your schema
    const pwdData = {
      first_name: req.body.first_name,
      middle_name: req.body.middle_name,
      last_name: req.body.last_name,
      barangay: req.body.barangay,
      purok: req.body.purok,
      birthday: new Date(req.body.birthday), // Convert string to Date
      age: parseInt(req.body.age), // Ensure age is a number
      gender: req.body.gender,
      place_of_birth: req.body.place_of_birth,
      civil_status: req.body.civil_status,
      spouse_name: req.body.spouse_name,
      contacts: req.body.contacts,
      fatherLastName: req.body.fatherLastName,
      fatherFirstName: req.body.fatherFirstName,
      fatherMiddleName: req.body.fatherMiddleName,
      fatherExtension: req.body.fatherExtension,
      motherLastName: req.body.motherLastName,
      motherFirstName: req.body.motherFirstName,
      motherMiddleName: req.body.motherMiddleName,
      sss_id: req.body.sss_id,
      gsis_sss_no: req.body.gsis_sss_no,
      psn_no: req.body.psn_no,
      philhealth_no: req.body.philhealth_no,
      education_level: req.body.education_level,
      employment_status: req.body.employment_status,
      employment_category: req.body.employment_category,
      employment_type: req.body.employment_type,
      disability: req.body.disability,
      disability_other_text: req.body.disability_other_text,
      cause_disability: req.body.cause_disability,
      cause_other_text: req.body.cause_other_text
    };

    // Create new PWD document
    const newPwd = new PWD(pwdData);
    
    // Save to database
    const savedPwd = await newPwd.save();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'PWD registration successful',
      data: savedPwd
    });

  } catch (err) {
    console.error('Registration error:', err);

    // Handle validation errors specifically
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Handle duplicate key errors (if you added unique constraints)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate key error',
        field: Object.keys(err.keyPattern)[0],
        error: `This ${Object.keys(err.keyPattern)[0]} is already registered`
      });
    }

    // Generic error handler
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: err.message
    });
  }
};

exports.updatePwd = async (req, res) => {
  try {
    console.log('Update PWD - Request body:', req.body);
    const { pwd_id, ...updateData } = req.body;
    
    console.log('PWD ID:', pwd_id);
    console.log('Update data:', updateData);
    console.log('Education level received:', updateData.education_level);
    console.log('Employment status received:', updateData.employment_status);
    
    if (!pwd_id) {
      return res.status(400).json({
        message: 'PWD ID is required',
        success: false
      });
    }

    // Convert birthday to Date object if provided
    if (updateData.birthday) {
      updateData.birthday = new Date(updateData.birthday);
    }

    // Convert age to number if provided
    if (updateData.age) {
      updateData.age = parseInt(updateData.age);
    }

    // Disability arrays are now sent directly as arrays from the frontend
    // No need to parse JSON strings since we're sending JSON data

    // Clean up empty strings and convert to null for optional fields only
    // Don't clean required fields to avoid validation errors
    const fieldsToClean = ['middle_name', 'place_of_birth', 'spouse_name', 
                          'fatherFirstName', 'fatherMiddleName', 'fatherLastName', 'fatherExtension',
                          'motherFirstName', 'motherMiddleName', 'motherLastName',
                          'employment_category', 'employment_type',
                          'disability_other_text', 'cause_other_text'];
    
    fieldsToClean.forEach(field => {
      if (updateData[field] === '' || updateData[field] === undefined) {
        updateData[field] = null;
      }
    });

    // Add edit tracking information (prefer session user, fallback to request data)
    const editorEmail = req.session?.user?.email || updateData.edited_by || 'Unknown';
    const editTimestamp = updateData.edited_at || new Date().toISOString();
    
    // Remove these from updateData as they're not part of the schema
    delete updateData.edited_by;
    delete updateData.edited_at;
    
    // Add edit log
    updateData.edit_log = {
      edited_by: editorEmail,
      edited_at: new Date(editTimestamp)
    };

    // Update the PWD record
    const updatedPwd = await PWD.findByIdAndUpdate(
      pwd_id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedPwd) {
      return res.status(404).json({
        message: 'PWD record not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'PWD record updated successfully',
      data: updatedPwd,
      success: true
    });
  } catch (err) {
    console.error('Error updating PWD:', err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation Error',
        errors: err.errors,
        success: false
      });
    }

    res.status(500).json({
      message: 'Internal Server Error',
      success: false
    });
  }
};

// Archive PWD record
exports.archivePwd = async (req, res) => {
  try {
    const { pwd_id } = req.body;
    
    if (!pwd_id) {
      return res.status(400).json({
        message: 'PWD ID is required',
        success: false
      });
    }

    // Update the PWD record status to Archived
    const archivedPwd = await PWD.findByIdAndUpdate(
      pwd_id,
      { status: 'Archived' },
      { new: true, runValidators: true }
    );

    if (!archivedPwd) {
      return res.status(404).json({
        message: 'PWD record not found',
        success: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'PWD record archived successfully',
      data: archivedPwd
    });

  } catch (err) {
    console.error('Archive PWD error:', err);
    res.status(500).json({
      message: 'Internal Server Error',
      success: false,
      error: err.message
    });
  }
};

// Unarchive PWD record
exports.unarchivePwd = async (req, res) => {
  try {
    const { pwd_id } = req.body;
    
    if (!pwd_id) {
      return res.status(400).json({
        message: 'PWD ID is required',
        success: false
      });
    }

    // Update the PWD record status to Active
    const unarchivedPwd = await PWD.findByIdAndUpdate(
      pwd_id,
      { status: 'Active' },
      { new: true, runValidators: true }
    );

    if (!unarchivedPwd) {
      return res.status(404).json({
        message: 'PWD record not found',
        success: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'PWD record unarchived successfully',
      data: unarchivedPwd
    });

  } catch (err) {
    console.error('Unarchive PWD error:', err);
    res.status(500).json({
      message: 'Internal Server Error',
      success: false,
      error: err.message
    });
  }
};

exports.generatePwdApplicationPdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PWD ID'
      });
    }

    const pwdRecord = await PWD.findById(id).lean();

    if (!pwdRecord) {
      return res.status(404).json({
        success: false,
        message: 'PWD record not found'
      });
    }

    const templatePath = path.join(__dirname, '../default/pdf/PWD-APPLICATION-FORMFIELD.pdf');
    const templateBytes = await fs.promises.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    const shouldLogDebug = process.env.NODE_ENV !== 'production';
    const warnMissingField = (msg) => {
      if (shouldLogDebug) {
        console.warn(`[PWD PDF] ${msg}`);
      }
    };

    const CONSISTENT_FONT_SIZE = 10; // Set consistent font size for all text fields

    const setText = (fieldName, value = '') => {
      if (!fieldName) return;
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
        // Set consistent font size for this field
        field.setFontSize(CONSISTENT_FONT_SIZE);
      } catch (err) {
        warnMissingField(`Text field "${fieldName}" not found`);
      }
    };

    const setCheckbox = (fieldName, checked) => {
      if (!fieldName) return;
      try {
        const field = form.getCheckBox(fieldName);
        if (checked) {
          field.check();
        } else {
          field.uncheck();
        }
      } catch (err) {
        warnMissingField(`Checkbox "${fieldName}" not found`);
      }
    };

    const setRadio = (fieldName, option) => {
      if (!fieldName) return;
      try {
        const radio = form.getRadioGroup(fieldName);
        if (option) {
          radio.select(option);
        } else {
          radio.clear();
        }
      } catch (err) {
        warnMissingField(`Radio group "${fieldName}" not found`);
      }
    };

    const formatDate = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    const civilStatusMap = {
      'Single': 'Single',
      'Single but Head of the Family': 'Single',
      'Separated': 'Separated',
      'Cohabitation (live-in)': 'Cohabitation livein',
      'Married': 'Married',
      'Widow/er': 'Widower',
      'Widowed': 'Widower'
    };

    const educationMap = {
      'Not Attended School': { radio: 'None', checks: [] },
      'Elementary Level': { radio: 'Elementary', checks: [] },
      'Elementary Graduate': { radio: 'Elementary', checks: [] },
      'High School Graduate': { radio: 'Junior High School', checks: ['Senior High School'] },
      'Vocational': { radio: 'Junior High School', checks: ['Vocational'] },
      'College Level': { radio: 'Junior High School', checks: ['College'] },
      'College Graduate': { radio: 'Junior High School', checks: ['College'] },
      'Post Graduate': { radio: 'Junior High School', checks: ['College', 'Post Graduate'] }
    };

    const employmentStatusMap = {
      'Employee': 'Employed',
      'Employed': 'Employed',
      'Unemployed': 'Unemployed',
      'Self-employed': 'Selfemployed',
      'Selfemployed': 'Selfemployed'
    };

    const disabilityFieldMap = {
      'Deaf or Hard of Hearing': 'Deaf or Hard of Hearing',
      'Intellectual Disability': 'Intellectual Disability',
      'Learning Disability': 'Learning Disability',
      'Mental Disability': 'Mental Disablity',
      'Physical Disability (Orthopedic)': 'Physical Disability',
      'Psychosocial Disability': 'Psychosocial Disability',
      'Speech and Language Impairment': 'Speech and Language Impairment',
      'Visual Disability': 'Visual Disability',
      'Cancer (RA11215)': 'Cancer RA11215',
      'Rare Disease (RA10747)': 'Rare Disease RA10747'
    };

    const causeFieldMap = {
      'Congenital / Inborn': 'Congenital  Inborn',
      'Acquired': 'Acquired',
      'Chronic Illness': 'Chronic Illness',
      'Injury': 'Injury',
      'Autism': 'Autism',
      'ADHD': 'ADHD',
      'Cerebral Palsy': 'Cerebral Palsy',
      'Down Syndrome': 'Down Syndrome'
    };

    // Personal information
    setText('LAST NAME', pwdRecord.last_name || '');
    setText('FIRST NAME', pwdRecord.first_name || '');
    setText('MIDDLE NAME', pwdRecord.middle_name || 'N/A');
    setText('SUFFIX', '');
    setText('Barangay', [pwdRecord.barangay, pwdRecord.purok].filter(Boolean).join(' / '));
    setText('DATE OF BIRTH', formatDate(pwdRecord.birthday));

    setCheckbox('Female', pwdRecord.gender === 'Female');
    setCheckbox('Male', pwdRecord.gender === 'Male');
    setRadio('7 CIVIL STATUS', civilStatusMap[pwdRecord.civil_status] || '');

    // Contact information
    const primaryContact = Array.isArray(pwdRecord.contacts) && pwdRecord.contacts.length > 0
      ? pwdRecord.contacts[0]
      : null;

    setText('Landline No', primaryContact?.phone || '');
    setText('Mobile No', primaryContact?.phone || '');
    setText('Email Address', primaryContact?.email || '');

    // Education & employment
    const educationSelection = educationMap[pwdRecord.education_level] || { radio: 'Junior High School', checks: [] };
    setRadio('12 EDUCATIONAL ATTAINMENT', educationSelection.radio);
    ['Senior High School', 'College', 'Vocational', 'Post Graduate'].forEach(option => {
      const shouldCheck = educationSelection.checks.includes(option);
      setCheckbox(option, shouldCheck);
    });

    setRadio('13 STATUS OF EMPLOYMENT', employmentStatusMap[pwdRecord.employment_status] || '');
    setRadio('13 a CATEGORY OF EMPLOYMENT', pwdRecord.employment_category || '');
    setText('Employment Category', pwdRecord.employment_type || '');

    // ID numbers
    setText('SSS NO', pwdRecord.sss_id || '');
    setText('GSIS NO', pwdRecord.gsis_sss_no || '');
    setText('PAGIBIG NO', '');
    setText('PSN NO', pwdRecord.psn_no || '');
    setText('PhilHealth NO', pwdRecord.philhealth_no || '');

    // Family information
    setText('LAST NAMEFATHERS NAME', pwdRecord.fatherLastName || '');
    setText('FIRST NAMEFATHERS NAME', pwdRecord.fatherFirstName || '');
    setText('MIDDLE NAMEFATHERS NAME', pwdRecord.fatherMiddleName || '');

    setText('LAST NAMEMOTHERS NAME', pwdRecord.motherLastName || '');
    setText('FIRST NAMEMOTHERS NAME', pwdRecord.motherFirstName || '');
    setText('MIDDLE NAMEMOTHERS NAME', pwdRecord.motherMiddleName || '');

    setCheckbox('APPLICANT', true);
    setCheckbox('GUARDIAN', false);
    setCheckbox('REPRESENTATTIVE', false);

    // Disability details
    Object.values(disabilityFieldMap).forEach(fieldName => setCheckbox(fieldName, false));
    if (Array.isArray(pwdRecord.disability)) {
      pwdRecord.disability.forEach(type => {
        const targetField = disabilityFieldMap[type];
        if (targetField) {
          setCheckbox(targetField, true);
        }
      });
    }

    Object.values(causeFieldMap).forEach(fieldName => setCheckbox(fieldName, false));
    if (Array.isArray(pwdRecord.cause_disability)) {
      pwdRecord.cause_disability.forEach(cause => {
        const targetField = causeFieldMap[cause];
        if (targetField) {
          setCheckbox(targetField, true);
        }
      });
    }

    // Optional "Other" text
    if (pwdRecord.disability_other_text || pwdRecord.cause_other_text) {
      const otherDetails = [
        pwdRecord.disability_other_text ? `Disability: ${pwdRecord.disability_other_text}` : null,
        pwdRecord.cause_other_text ? `Cause: ${pwdRecord.cause_other_text}` : null
      ].filter(Boolean).join(' | ');
      setText('15 ORGANIZATION INFORMATION', otherDetails);
    }

    // Try to flatten the form, but continue if it fails (some PDFs have broken references)
    try {
      form.flatten();
    } catch (flattenError) {
      console.warn('[PWD PDF] Could not flatten form, saving without flattening:', flattenError.message);
      // Continue without flattening - the form will still be filled
    }
    
    const pdfBytes = await pdfDoc.save();
    const safeLast = (pwdRecord.last_name || 'PWD').replace(/\s+/g, '-');
    const safeFirst = (pwdRecord.first_name || 'Record').replace(/\s+/g, '-');
    const filename = `PWD-${safeLast}-${safeFirst}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    return res.send(pdfBytes);
  } catch (error) {
    console.error('Error generating PWD PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PWD PDF'
    });
  }
};

// Archive Senior Citizen record
exports.archiveSenior = async (req, res) => {
  try {
    const { senior_id } = req.body;
    
    if (!senior_id) {
      return res.status(400).json({
        message: 'Senior Citizen ID is required',
        success: false
      });
    }

    // Update the Senior Citizen record status to Archived
    const archivedSenior = await SeniorCitizen.findByIdAndUpdate(
      senior_id,
      { status: 'Archived' },
      { new: true, runValidators: true }
    );

    if (!archivedSenior) {
      return res.status(404).json({
        message: 'Senior Citizen record not found',
        success: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Senior Citizen record archived successfully',
      data: archivedSenior
    });

  } catch (err) {
    console.error('Archive Senior error:', err);
    res.status(500).json({
      message: 'Internal Server Error',
      success: false,
      error: err.message
    });
  }
};

// Unarchive Senior Citizen record
exports.unarchiveSenior = async (req, res) => {
  try {
    const { senior_id } = req.body;
    
    if (!senior_id) {
      return res.status(400).json({
        message: 'Senior Citizen ID is required',
        success: false
      });
    }

    // Update the Senior Citizen record status to Active
    const unarchivedSenior = await SeniorCitizen.findByIdAndUpdate(
      senior_id,
      { status: 'Active' },
      { new: true, runValidators: true }
    );

    if (!unarchivedSenior) {
      return res.status(404).json({
        message: 'Senior Citizen record not found',
        success: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Senior Citizen record unarchived successfully',
      data: unarchivedSenior
    });

  } catch (err) {
    console.error('Unarchive Senior error:', err);
    res.status(500).json({
      message: 'Internal Server Error',
      success: false,
      error: err.message
    });
  }
};

// Archive Youth record
exports.archiveYouth = async (req, res) => {
  try {
    const { youth_id } = req.body;
    
    if (!youth_id) {
      return res.status(400).json({
        message: 'Youth ID is required',
        success: false
      });
    }

    // Update the Youth record status to Archived
    const archivedYouth = await Youth.findByIdAndUpdate(
      youth_id,
      { status: 'Archived' },
      { new: true, runValidators: true }
    );

    if (!archivedYouth) {
      return res.status(404).json({
        message: 'Youth record not found',
        success: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Youth record archived successfully',
      data: archivedYouth
    });

  } catch (err) {
    console.error('Archive Youth error:', err);
    res.status(500).json({
      message: 'Internal Server Error',
      success: false,
      error: err.message
    });
  }
};

// Unarchive Youth record
exports.unarchiveYouth = async (req, res) => {
  try {
    const { youth_id } = req.body;
    
    if (!youth_id) {
      return res.status(400).json({
        message: 'Youth ID is required',
        success: false
      });
    }

    // Update the Youth record status to Active
    const unarchivedYouth = await Youth.findByIdAndUpdate(
      youth_id,
      { status: 'Active' },
      { new: true, runValidators: true }
    );

    if (!unarchivedYouth) {
      return res.status(404).json({
        message: 'Youth record not found',
        success: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Youth record unarchived successfully',
      data: unarchivedYouth
    });

  } catch (err) {
    console.error('Unarchive Youth error:', err);
    res.status(500).json({
      message: 'Internal Server Error',
      success: false,
      error: err.message
    });
  }
};

// Generate Senior Citizen Application PDF
exports.generateSeniorApplicationPdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Senior Citizen ID'
      });
    }

    const seniorRecord = await SeniorCitizen.findById(id).lean();

    if (!seniorRecord) {
      return res.status(404).json({
        success: false,
        message: 'Senior Citizen record not found'
      });
    }

    const templatePath = path.join(__dirname, '../default/pdf/SENIOR-FORMFIELD.pdf');
    const templateBytes = await fs.promises.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    const shouldLogDebug = process.env.NODE_ENV !== 'production';
    const warnMissingField = (msg) => {
      if (shouldLogDebug) {
        console.warn(`[Senior PDF] ${msg}`);
      }
    };

    const CONSISTENT_FONT_SIZE = 10; // Set consistent font size for all text fields

    const setText = (fieldName, value = '') => {
      if (!fieldName) return;
      try {
        const field = form.getTextField(fieldName);
        field.setText(String(value || ''));
        // Set consistent font size for this field
        field.setFontSize(CONSISTENT_FONT_SIZE);
      } catch (err) {
        warnMissingField(`Text field "${fieldName}" not found`);
      }
    };

    const setCheckbox = (fieldName, checked) => {
      if (!fieldName) return;
      try {
        const field = form.getCheckBox(fieldName);
        if (checked) {
          field.check();
        } else {
          field.uncheck();
        }
      } catch (err) {
        warnMissingField(`Checkbox "${fieldName}" not found`);
      }
    };

    const formatDate = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    const info = seniorRecord.identifying_information || {};
    const name = info.name || {};
    const address = info.address || {};
    const family = seniorRecord.family_composition || {};
    const education = seniorRecord.education_hr_profile || {};

    // Basic Information - Using actual PDF field names
    setText('LAST NAME', name.last_name || '');
    setText('FIRST NAME', name.first_name || '');
    setText('MIDDLE NAME', name.middle_name || '');
    setText('BARANGAY', address.barangay || '');
    setText('PUROK', address.purok || '');
    setText('PLACE OF BIRTH', Array.isArray(info.place_of_birth) ? info.place_of_birth.join(', ') : (info.place_of_birth || ''));
    setText('MARITAL STATUS', info.marital_status || '');
    setText('GENDER', info.gender || '');
    
    // Date of Birth - using numbered field (likely Text Field129 or similar)
    // Try multiple possible date fields
    const dobFormatted = formatDate(info.date_of_birth);
    if (dobFormatted) {
      setText('Text Field129', dobFormatted);
      setText('Text Field128', dobFormatted);
      setText('Text Field127', dobFormatted);
    setText('BIRTHDATE', dobFormatted); // Add BIRTHDATE field
    }
     
    // Contact Information
    const primaryContact = Array.isArray(info.contacts) && info.contacts.length > 0 ? info.contacts[0] : null;
    setText('CONTACT', primaryContact?.phone || '');
    setText('EMAIL', primaryContact?.email || '');
    setText('RELIGION', ''); // Not in schema
    
    // ID Information
    setText('OSCA ID', info.osca_id_number || '');
    setText('GSIS/SSS', info.gsis_sss || '');
    setText('TIN', info.tin || '');
    setText('PHILHEALTH', info.philhealth || '');
    setText('OTHER ID', info.other_govt_id || '');
    
    // Employment and Pension
    setText('SERVICE BUSINESS EMPLOYMENT', info.service_business_employment || '');
    setText('CURRENT PENSION', info.current_pension || '');
    
    // Family Composition
    setText('NAME OF SPOUSE', family.spouse?.name || '');
    
    const father = family.father || {};
    setText('FATHER FIRST NAME', father.first_name || '');
    setText('FATHER LAST NAME', father.last_name || '');
    setText('FATHER MIDDLE NAME', father.middle_name || '');
    setText('FATHER EXTENSION', father.extension || '');
    
    const mother = family.mother || {};
    setText('MOTHER FIRST NAME', mother.first_name || '');
    setText('MOTHER LAST NAME', mother.last_name || '');
    setText('MOTHER MIDDLE NAME', mother.middle_name || '');
    
    // Children - handle first child if available
    if (Array.isArray(family.children) && family.children.length > 0) {
      const firstChild = family.children[0];
      setText('CHILDREN', firstChild.full_name || '');
      setText('CHILDREN OCCUPATION', firstChild.occupation || '');
      setText('INCOME', firstChild.income || '');
      setText('CHILD AGE', firstChild.age ? String(firstChild.age) : '');
      setText('WORKING/ NOT WORKING', firstChild.working_status || '');
    }
    
    // Travel capability
    setCheckbox('TRAVEL YES', info.capability_to_travel === 'Yes' || info.capability_to_travel === 'Capable');
    setCheckbox('TRAVEL NO', info.capability_to_travel === 'No' || info.capability_to_travel === 'Not Capable');
    
    // Education Attainment
    const educationLevels = Array.isArray(education.educational_attainment) ? education.educational_attainment : [];
    setCheckbox('ELEMENTARY LEVEL', educationLevels.some(e => e.includes('Elementary Level')));
    setCheckbox('ELEMENTARY GRADUATE', educationLevels.some(e => e.includes('Elementary Graduate')));
    setCheckbox('HIGHSCHOOL LEVEL', educationLevels.some(e => e.includes('High School Level')));
    setCheckbox('HIGHSCHOOL GRADUATE', educationLevels.some(e => e.includes('High School Graduate')));
    setCheckbox('COLLEGE LEVEL', educationLevels.some(e => e.includes('College Level')));
    setCheckbox('COLLEGE GRADUATE', educationLevels.some(e => e.includes('College Graduate')));
    setCheckbox('POST GRADUATE', educationLevels.some(e => e.includes('Post Graduate')));
    setCheckbox('VOCATIONAL', educationLevels.some(e => e.includes('Vocational')));
    setCheckbox('NOT ATTENDED SCHOOL', educationLevels.some(e => e.includes('Not Attended')));
    
    // Skills
    const skills = Array.isArray(education.skills) ? education.skills : [];
    const skillMap = {
      'FISHING': 'Fishing',
      'ENGINEERING': 'Engineering',
      'BARBER': 'Barber',
      'EVANGELIZATION': 'Evangelization',
      'MILWRIGHT': 'Milwright',
      'TEACHING': 'Teaching',
      'COUNSELING': 'Counseling',
      'COOKING': 'Cooking',
      'CARPENTER': 'Carpenter',
      'MASON': 'Mason',
      'TAILOR': 'Tailor',
      'FARMING': 'Farming',
      'ARTS': 'Arts',
      'PLUMBER': 'Plumber',
      'SAPATERO': 'Sapatero',
      'CHEF/COOK': 'Chef/Cook',
      'DENTAL SKILLS': 'Dental',
      'MEDICAL SKILLS': 'Medical',
      'LEGAL SERVICES SKILLS': 'Legal Services'
    };
    
    Object.keys(skillMap).forEach(pdfField => {
      const skillName = skillMap[pdfField];
      setCheckbox(pdfField, skills.some(s => s && s.toLowerCase().includes(skillName.toLowerCase())));
    });
    
    if (education.skill_other_text) {
      setText('SKILL OTHER TEXT', education.skill_other_text);
      setCheckbox('OTHERS TECHNICAL SKILLS', true);
    }
    
    // Community Service
    const communityServices = Array.isArray(seniorRecord.community_service) ? seniorRecord.community_service : [];
    setCheckbox('MEDICAL COMMUNITY SERVICE', communityServices.some(s => s && s.toLowerCase().includes('medical')));
    setCheckbox('COMMUNITY/ ORGANIZATION LEADER', communityServices.some(s => s && s.toLowerCase().includes('leader')));
    setCheckbox('NEIGHBORHOOD SUPPORT SERVICES', communityServices.some(s => s && s.toLowerCase().includes('neighborhood')));
    setCheckbox('COUNSELING / REFERRAL', communityServices.some(s => s && s.toLowerCase().includes('counseling')));
    setCheckbox('RESOURCE VOLUNTEER', communityServices.some(s => s && s.toLowerCase().includes('volunteer')));
    setCheckbox('DENTAL COMMUNITY SERVICE', communityServices.some(s => s && s.toLowerCase().includes('dental')));
    setCheckbox('LEAGAL SERVICES COMMUNITY SERVICE', communityServices.some(s => s && s.toLowerCase().includes('legal')));
    setCheckbox('COMMUNITY BEAUTIFICATION', communityServices.some(s => s && s.toLowerCase().includes('beautification')));
    setCheckbox('FRIENDLY VISIT', communityServices.some(s => s && s.toLowerCase().includes('friendly')));
    setCheckbox('RELIGIOUS', communityServices.some(s => s && s.toLowerCase().includes('religious')));
    
    if (seniorRecord.community_service_other_text) {
      setText('COMMUNITY SERVICE OTHER TEXT', seniorRecord.community_service_other_text);
      setCheckbox('OTHERS COMMUNITY SERCVICE', true);
      setCheckbox('OTHERS COMMUNITY SERVICE', true);
    }

    // Try to flatten the form, but continue if it fails (some PDFs have broken references)
    try {
      form.flatten();
    } catch (flattenError) {
      console.warn('[Senior PDF] Could not flatten form, saving without flattening:', flattenError.message);
      // Continue without flattening - the form will still be filled
    }    const pdfBytes = await pdfDoc.save();
    const safeLast = (name.last_name || 'Senior').replace(/\s+/g, '-');
    const safeFirst = (name.first_name || 'Record').replace(/\s+/g, '-');
    const filename = `Senior-${safeLast}-${safeFirst}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    return res.send(pdfBytes);
  } catch (error) {
    console.error('Error generating Senior PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Senior PDF'
    });
  }
};

// Generate Youth Application PDF
exports.generateYouthApplicationPdf = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Youth ID'
      });
    }

    const youthRecord = await Youth.findById(id).lean();

    if (!youthRecord) {
      return res.status(404).json({
        success: false,
        message: 'Youth record not found'
      });
    }

    const templatePath = path.join(__dirname, '../default/pdf/YOUTH-FORMFIELD.pdf');
    const templateBytes = await fs.promises.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    const shouldLogDebug = process.env.NODE_ENV !== 'production';
    const warnMissingField = (msg) => {
      if (shouldLogDebug) {
        console.warn(`[Youth PDF] ${msg}`);
      }
    };

    const CONSISTENT_FONT_SIZE = 10; // Set consistent font size for all text fields

    const setText = (fieldName, value = '') => {
      if (!fieldName) return;
      try {
        const field = form.getTextField(fieldName);
        field.setText(String(value || ''));
        // Set consistent font size for this field
        field.setFontSize(CONSISTENT_FONT_SIZE);
      } catch (err) {
        warnMissingField(`Text field "${fieldName}" not found`);
      }
    };

    const setCheckbox = (fieldName, checked) => {
      if (!fieldName) return;
      try {
        const field = form.getCheckBox(fieldName);
        if (checked) {
          field.check();
        } else {
          field.uncheck();
        }
      } catch (err) {
        warnMissingField(`Checkbox "${fieldName}" not found`);
      }
    };

    const formatDate = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    // Basic Information - Using actual PDF field names
    setText('LAST NAME', youthRecord.last_name || '');
    setText('FIRST NAME', youthRecord.first_name || '');
    setText('MIDDLE NAME', youthRecord.middle_name || '');
    setText('BARANGAY', youthRecord.barangay || '');
    setText('PUROK', youthRecord.purok || '');
    setText('Birthday', formatDate(youthRecord.birthday));
    setText('Age', String(youthRecord.age || ''));
    setText('Contact', youthRecord.contact || '');
    setText('Email Address', ''); // Not in schema
    
    // Gender checkboxes
    setCheckbox('MALE', youthRecord.gender === 'Male');
    setCheckbox('FEMALE', youthRecord.gender === 'Female');
    
    // Civil Status checkboxes
    const civilStatus = youthRecord.civil_status || '';
    setCheckbox('SINGLE', civilStatus.includes('Single'));
    setCheckbox('MARRIED', civilStatus === 'Married');
    setCheckbox('WIDOWED', civilStatus === 'Widowed');
    setCheckbox('DIVORCED', civilStatus === 'Divorced');
    setCheckbox('SEPERATED', civilStatus === 'Separated');
    setCheckbox('ANNULLED', civilStatus === 'Annulled');
    setCheckbox('LIVE IN', civilStatus === 'Cohabitation (live-in)');
    
    // Youth Classification
    const classifications = Array.isArray(youthRecord.youth_classification) ? youthRecord.youth_classification : [];
    setCheckbox('IN SCHOOL YOUTH', classifications.some(c => c && c.toLowerCase().includes('in school')));
    setCheckbox('OUT OF SCHOOL YOUTH', classifications.some(c => c && c.toLowerCase().includes('out of school')));
    setCheckbox('WORKING YOUTH', classifications.some(c => c && c.toLowerCase().includes('working')));
    setCheckbox('YOUTH W/ SPECIFIC NEEDS', classifications.some(c => c && c.toLowerCase().includes('specific needs')));
    
    // Youth Age Group
    const ageGroups = Array.isArray(youthRecord.youth_age_group) ? youthRecord.youth_age_group : [];
    setCheckbox('CHILD YOUTH', ageGroups.some(a => a && a.toLowerCase().includes('15-17')));
    setCheckbox('CORE YOUTH', ageGroups.some(a => a && a.toLowerCase().includes('18-24')));
    setCheckbox('YOUNG ADULT', ageGroups.some(a => a && a.toLowerCase().includes('15-30')));
    
    // Employment Status
    setCheckbox('EMPLOYED', youthRecord.employment_status === 'Employee' || youthRecord.employment_status === 'Employed');
    setCheckbox('UNEMPLOYED', youthRecord.employment_status === 'Unemployed');
    setCheckbox('SELF EMPLOYED', youthRecord.employment_status === 'Self-employed' || youthRecord.employment_status === 'Selfemployed');
    
    // Education Level
    const educationLevel = youthRecord.education_level || '';
    setCheckbox('ELEMENTARY LEVEL', educationLevel.includes('Elementary Level'));
    setCheckbox('ELEMENTARY GRAD', educationLevel.includes('Elementary Graduate'));
    setCheckbox('HIGHSCHOOL LEVEL', educationLevel.includes('High School Level'));
    setCheckbox('HIGHSCHOOL GRAD', educationLevel.includes('High School Graduate'));
    setCheckbox('VOCATIONAL GRAD', educationLevel.includes('Vocational'));
    setCheckbox('COLLEGE LEVEL', educationLevel.includes('College Level'));
    setCheckbox('COLLEGE GRAD', educationLevel.includes('College Graduate'));
    setCheckbox('MASTERS LEVEL', educationLevel.includes('Masters'));
    setCheckbox('MASTERS GRAD', educationLevel.includes('Masters Graduate'));
    setCheckbox('DOCTORATE LEVEL', educationLevel.includes('Doctorate'));
    
    // SK Voter
    setCheckbox('SK VOTER YES', youthRecord.registered_sk === 'Yes');
    setCheckbox('SK VOTER NO', youthRecord.registered_sk === 'No');
    
    // National Voter
    setCheckbox('NATIONAL VOTER YES', youthRecord.registered_national === 'Yes');
    setCheckbox('NATIONAL VOTER NO', youthRecord.registered_national === 'No');
    
    // Assembly
    setCheckbox('ASSEMBLY YES', youthRecord.Assembly === 'Yes');
    setCheckbox('ASSEMBLY NO', youthRecord.Assembly === 'No');
    
    // SK Election
    setCheckbox('SK ELECTION YES', youthRecord.voted_sk === 'Yes');
    setCheckbox('SK ELECTION NO', youthRecord.voted_sk === 'No');
    
    // Assembly Times
    const skTimes = youthRecord.sk_times || '';
    setCheckbox('HOW MANY TIMES 1-2', skTimes === '1-2');
    setCheckbox('HOW MANY TIMES 3-4', skTimes === '3-4');
    setCheckbox('HOW MANY TIMES 5 AND ABOVE', skTimes === '5+');
    
    // Assembly Reason
    const reason = youthRecord.reason || '';
    setCheckbox('THERE WAS NO KK ASSEMBLY MEETING', reason.includes('No KK Assembly Meeting'));
    setCheckbox('NOT INTERESTED TO ATTEND', reason.includes('Not interested'));
    
    // Try to flatten the form, but continue if it fails (some PDFs have broken references)
    try {
      form.flatten();
    } catch (flattenError) {
      console.warn('[Youth PDF] Could not flatten form, saving without flattening:', flattenError.message);
      // Continue without flattening - the form will still be filled
    }
    
    const pdfBytes = await pdfDoc.save();
    const safeLast = (youthRecord.last_name || 'Youth').replace(/\s+/g, '-');
    const safeFirst = (youthRecord.first_name || 'Record').replace(/\s+/g, '-');
    const filename = `Youth-${safeLast}-${safeFirst}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    return res.send(pdfBytes);
  } catch (error) {
    console.error('Error generating Youth PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Youth PDF'
    });
  }
};
  
// Analytics: OSCA (Senior Citizens) counts by barangay
exports.getOscaAnalytics = async (req, res) => {
  try {
    const results = await SeniorCitizen.aggregate([
      {
        $match: {
          status: { $ne: 'Archived' } // Exclude archived records
        }
      },
      {
        $group: {
          _id: "$identifying_information.address.barangay",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const data = results
      .filter(r => r._id)
      .map((r, idx) => ({ id: idx + 1, name: r._id, oscaCount: r.count }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('OSCA analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to load OSCA analytics' });
  }
};

// Get senior citizens data for report generation (with gender information)
exports.getSeniorCitizensForReport = async (req, res) => {
  try {
    const seniors = await SeniorCitizen.find(
      { status: { $ne: 'Archived' } },
      'identifying_information.address.barangay identifying_information.gender'
    );
    
    res.json({ success: true, data: seniors });
  } catch (err) {
    console.error('Error fetching senior citizens for report:', err);
    res.status(500).json({ success: false, message: 'Failed to load senior citizens data' });
  }
};

// Analytics: PDAO (PWD) counts and gender breakdown by barangay
exports.getPdaoAnalytics = async (req, res) => {
  try {
    const results = await PWD.aggregate([
      {
        $match: {
          status: { $ne: 'Archived' } // Exclude archived records
        }
      },
      {
        $group: {
          _id: "$barangay",
          pdaoCount: { $sum: 1 },
          maleCount: { $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } },
          femaleCount: { $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const data = results
      .filter(r => r._id)
      .map((r, idx) => ({
        id: idx + 1,
        name: r._id,
        pdaoCount: r.pdaoCount,
        maleCount: r.maleCount,
        femaleCount: r.femaleCount
      }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('PDAO analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to load PDAO analytics' });
  }
};

// Fetch barangays and their puroks from the database
async function fetchBarangays() {
  const barangayList = await Barangay.find({});

  if (!barangayList || barangayList.length === 0) {
    return null;
  }

  const puroks = {};
  barangayList.forEach(({ barangay, puroks: purokList }) => {
    puroks[barangay] = purokList;
  });

  return puroks;
}

exports.renderSeniorForm = async (req, res) => {
 try {
    const barangays = await fetchBarangays();
    // Filter based on status query parameter
    let statusFilter = {};
    if (req.query.status === 'archived') {
      statusFilter = { status: 'Archived' };
    } else if (req.query.status === 'all') {
      statusFilter = {}; // Show all records
    } else {
      statusFilter = { status: { $ne: 'Archived' } }; // Default: show only Active records
    }
    const seniorCitizens = await SeniorCitizen.find(statusFilter);

    if (!barangays) {
      return res.status(404).send('No barangays found');
    }

    // Pass the barangays data to the EJS template
    res.render('staff/staff_senior', {
      barangays: barangays || {},
      seniorCitizens: seniorCitizens || {},
      user: req.session?.user || null
    });
  } catch (err) {
    console.error('Error fetching barangays:', err);
    res.status(500).send('Internal Server Error');
  }
  };

exports.updateSenior = async (req, res) => {
  try {
    const { residentId, ...updateData } = req.body;
    
    if (!residentId) {
      return res.status(400).json({
        success: false,
        error: "Resident ID is required"
      });
    }

    // Build the update object based on the nested structure
    const updateObject = {};

    // Handle identifying_information fields
    if (updateData.first_name || updateData.middle_name || updateData.last_name) {
      updateObject['identifying_information.name.first_name'] = updateData.first_name;
      updateObject['identifying_information.name.middle_name'] = updateData.middle_name;
      updateObject['identifying_information.name.last_name'] = updateData.last_name;
    }

    if (updateData.barangay || updateData.purok) {
      updateObject['identifying_information.address.barangay'] = updateData.barangay;
      updateObject['identifying_information.address.purok'] = updateData.purok;
    }

    if (updateData.gender) {
      updateObject['identifying_information.gender'] = updateData.gender;
    }

    if (updateData.birthday) {
      updateObject['identifying_information.date_of_birth'] = new Date(updateData.birthday);
    }

    if (updateData.age) {
      updateObject['identifying_information.age'] = parseInt(updateData.age);
    }

    if (updateData.marital_status) {
      updateObject['identifying_information.marital_status'] = updateData.marital_status;
    }

    if (updateData.place_of_birth) {
      updateObject['identifying_information.place_of_birth'] = updateData.place_of_birth;
    }

    // Handle ID information
    if (updateData.osca_id) {
      updateObject['identifying_information.osca_id_number'] = updateData.osca_id;
    }

    if (updateData.gsis_sss) {
      updateObject['identifying_information.gsis_sss'] = updateData.gsis_sss;
    }

    if (updateData.philhealth) {
      updateObject['identifying_information.philhealth'] = updateData.philhealth;
    }

    if (updateData.tin) {
      updateObject['identifying_information.tin'] = updateData.tin;
    }

    // Handle family composition
    if (updateData.father_name) {
      const fatherParts = updateData.father_name.trim().split(' ');
      if (fatherParts.length >= 2) {
        updateObject['family_composition.father.first_name'] = fatherParts[0];
        updateObject['family_composition.father.last_name'] = fatherParts[fatherParts.length - 1];
        if (fatherParts.length > 2) {
          updateObject['family_composition.father.middle_name'] = fatherParts.slice(1, -1).join(' ');
        }
      }
    }

    if (updateData.mother_name) {
      const motherParts = updateData.mother_name.trim().split(' ');
      if (motherParts.length >= 2) {
        updateObject['family_composition.mother.first_name'] = motherParts[0];
        updateObject['family_composition.mother.last_name'] = motherParts[motherParts.length - 1];
        if (motherParts.length > 2) {
          updateObject['family_composition.mother.middle_name'] = motherParts.slice(1, -1).join(' ');
        }
      }
    }

    if (updateData.spouse_name && updateData.marital_status === 'Married') {
      updateObject['family_composition.spouse.name'] = updateData.spouse_name;
    }

    // Handle contacts
    if (updateData.contacts && Array.isArray(updateData.contacts)) {
      updateObject['identifying_information.contacts'] = updateData.contacts.filter(contact => 
        contact.name && contact.name.trim() !== ''
      );
    }

    // Add edit tracking information (prefer session user, fallback to request data)
    const editorEmail = req.session?.user?.email || updateData.edited_by || 'Unknown';
    const editTimestamp = updateData.edited_at || new Date().toISOString();
    
    // Remove these from updateObject as they're not part of the schema
    delete updateData.edited_by;
    delete updateData.edited_at;
    
    // Add edit log
    updateObject['edit_log'] = {
      edited_by: editorEmail,
      edited_at: new Date(editTimestamp)
    };

    console.log('Update object:', updateObject);

    // Update the senior citizen record
    const updatedSenior = await SeniorCitizen.findByIdAndUpdate(
      residentId,
      { $set: updateObject },
      { new: true, runValidators: true }
    );

    if (!updatedSenior) {
      return res.status(404).json({
        success: false,
        error: "Senior citizen not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Senior citizen updated successfully",
      data: updatedSenior
    });

  } catch (error) {
    console.error('Error updating senior citizen:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
};

  exports.renderPWDForm = async (req, res) => {
 try {
    const barangays = await fetchBarangays();
    // Filter based on status query parameter
    let statusFilter = {};
    if (req.query.status === 'archived') {
      statusFilter = { status: 'Archived' };
    } else if (req.query.status === 'all') {
      statusFilter = {}; // Show all records
    } else {
      statusFilter = { status: { $ne: 'Archived' } }; // Default: show only Active records
    }
    const pwd = await PWD.find(statusFilter);

 
    // Pass the barangays data to the EJS template
    res.render('staff/staff_pwd', {
      barangays: barangays || {},
      pwds: pwd || {},
      user: req.session?.user || null
    });
  } catch (err) {
    console.error('Error fetching barangays:', err);
    res.status(500).send('Internal Server Error');
  }
  };

  exports.renderAddSenior = async (req, res) => {
 try {
    const barangays = await fetchBarangays();
    
    if (!barangays) {
      return res.status(404).send('No barangays found');
    }
  
    // Pass the barangays data to the EJS template
    
    res.render('staff/staff_addSenior', {
      barangays: barangays || {},
    });
  } catch (err) {
    console.error('Error fetching barangays:', err);
    res.status(500).send('Internal Server Error');
  }
  };

   exports.renderAddPWD = async (req, res) => {
 try {
    const barangays = await fetchBarangays();
    // if (!barangays) {
    //   return res.status(404).send('No barangays found');
    // }
  
    // Pass the barangays data to the EJS template
   
    res.render('staff/staff_addPwd', {
      barangays: barangays || {}
    });
  } catch (err) {
    console.error('Error fetching barangays:', err);
    res.status(500).send('Internal Server Error');
  }
  };

   exports.renderSuperAdminUser = async (req, res) => {
 try {
   const users = await User.find({});
    if (!users) {
      //to change
      console.log('No users found');
    }
  
    // Pass the barangays data to the EJS template
   
    res.render('superadmin/superadmin_users', {
      users: users || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
  };

   exports.renderSuperAdminIndex = async (req, res) => {
 try {
    const barangays = await fetchBarangays();
    
    // if (!barangays) {
    //   return res.status(404).send('No barangays found');
    // }
  
    // Pass the barangays data to the EJS template
   
    res.render('superadmin/admin_super_admin', {
      barangays: barangays || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
  };

    exports.renderYouthForm = async (req, res) => {
 try {
    const barangays = await fetchBarangays();
    
    // if (!barangays) {
    //   return res.status(404).send('No barangays found');
    // }
  
    // Pass the barangays data to the EJS template
   
    res.render('youth/staff_youth_add', {
      barangays: barangays || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
  };
  
exports.renderSuperAdminIndex = async (req, res) => {
 try {
    const barangays = await fetchBarangays();
    
    if (!barangays) {
      return res.status(404).send('No barangays found');
    }
  
    // Pass the barangays data to the EJS template
   
    res.render('superadmin/admin_super_admin', {
      barangays: barangays || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
  };

// Function to check birthdays and update ages, auto-archive if age > 30
const checkBirthdaysAndUpdateAges = async () => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const todayDay = today.getDate();

    // Get all active youth records
    const activeYouths = await Youth.find({ status: 'Active' });

    let updatedCount = 0;
    let archivedCount = 0;

    for (const youth of activeYouths) {
      if (!youth.birthday) continue;

      const birthday = new Date(youth.birthday);
      const birthdayMonth = birthday.getMonth() + 1;
      const birthdayDay = birthday.getDate();

      // Check if today is their birthday (month and day match)
      if (birthdayMonth === todayMonth && birthdayDay === todayDay) {
        // Calculate the correct age based on birthday
        let correctAge = today.getFullYear() - birthday.getFullYear();
        const monthDiff = today.getMonth() - birthday.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
          correctAge--;
        }

        // Only update if the stored age is less than the correct age
        // This prevents multiple increments if the page is loaded multiple times on the same day
        // On their birthday, the age should increase by 1 from what it was yesterday
        if (youth.age < correctAge) {
          const newAge = correctAge; // This is effectively adding 1 on their birthday
          
          // If age is over 30, archive the record
          if (newAge > 30) {
            await Youth.findByIdAndUpdate(
              youth._id,
              { 
                age: newAge,
                status: 'Archived'
              },
              { new: true, runValidators: true }
            );
            archivedCount++;
            console.log(`Youth ${youth.first_name} ${youth.last_name} turned ${newAge} and was automatically archived.`);
          } else {
            // Just update the age (adds 1 on their birthday)
            await Youth.findByIdAndUpdate(
              youth._id,
              { age: newAge },
              { new: true, runValidators: true }
            );
            updatedCount++;
            console.log(`Youth ${youth.first_name} ${youth.last_name} turned ${newAge} (birthday today).`);
          }
        }
      }
    }

    if (updatedCount > 0 || archivedCount > 0) {
      console.log(`Birthday check completed: ${updatedCount} ages updated, ${archivedCount} records archived.`);
    }

    return { updatedCount, archivedCount };
  } catch (err) {
    console.error('Error checking birthdays and updating ages:', err);
    throw err;
  }
};

exports.renderYouth = async (req, res) => {
 try {
    // Check birthdays and update ages before rendering
    await checkBirthdaysAndUpdateAges();

    const barangays = await fetchBarangays();
    // Filter based on status query parameter
    let statusFilter = {};
    if (req.query.status === 'archived') {
      statusFilter = { status: 'Archived' };
    } else if (req.query.status === 'all') {
      statusFilter = {}; // Show all records
    } else {
      statusFilter = { status: { $ne: 'Archived' } }; // Default: show only Active records
    }
    const youthData = await Youth.find(statusFilter);

    console.log(youthData);
  
    // Pass the barangays data to the EJS template
   
    res.render('youth/staff_youth', {
      barangays: barangays || {},
      youths: youthData || {},
      user: req.session?.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
  };



exports.createYouth = async (req, res) => {
  try {
    console.log('Raw body:', req.body);

    // Destructure req.body
    const {
      first_name,
      middle_name,
      last_name,
      barangay,
      purok,
      contact,
      birthday,
      age,
      gender,
      place_of_birth,
      education_level,
      registered_sk,
      voted_sk,
      registered_national,
      employment_status,
      employment_category,
      employment_type,
      Assembly,
      sk_times,
      reason,
      youth_classification,
      youth_other_text,
      youth_age_group,
      age_other_text
    } = req.body;

    // Create new Youth document
    const newYouth = new Youth({
      first_name,
      middle_name,
      last_name,
      barangay,
      purok,
      contact,
      birthday: new Date(birthday), // ensure Date type
      age: parseInt(age, 10), // ensure Number type
      gender,
      place_of_birth,
      education_level,
      registered_sk,
      voted_sk,
      registered_national,
      employment_status,
      employment_category: employment_category || null,
      employment_type: employment_type || null,
      Assembly,
      sk_times: sk_times || null,
      reason: reason || null,
      youth_classification,
      youth_classification_other: youth_other_text || null,
      youth_age_group,
      youth_age_group_other: age_other_text || null,
    });

    // Save to database
    const savedYouth = await newYouth.save();

    res.status(201).json({
      message: 'Youth record created successfully',
      data: savedYouth
    });
  } catch (err) {
    console.error(err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation Error',
        errors: err.errors
      });
    }

    res.status(500).send('Internal Server Error');
  }
};

exports.updateYouth = async (req, res) => {
  try {
    console.log('Update Youth - Request body:', req.body);
    const { youthId, ...updateData } = req.body;
    
    console.log('Youth ID:', youthId);
    console.log('Update data:', updateData);
    
    if (!youthId) {
      return res.status(400).json({
        message: 'Youth ID is required',
        success: false
      });
    }

    // Convert birthday to Date object
    if (updateData.birthday) {
      updateData.birthday = new Date(updateData.birthday);
    }

    // Clean up empty strings and convert to null for optional fields
    const fieldsToClean = ['sk_times', 'reason', 'employment_category', 'employment_type', 'voted_sk', 'youth_classification_other', 'youth_age_group_other'];
    fieldsToClean.forEach(field => {
      if (updateData[field] === '' || updateData[field] === undefined) {
        updateData[field] = null;
      }
    });

    // Add edit tracking information (prefer session user, fallback to request data)
    const editorEmail = req.session?.user?.email || updateData.edited_by || 'Unknown';
    const editTimestamp = updateData.edited_at || new Date().toISOString();
    
    // Remove these from updateData as they're not part of the schema
    delete updateData.edited_by;
    delete updateData.edited_at;
    
    // Add edit log
    updateData.edit_log = {
      edited_by: editorEmail,
      edited_at: new Date(editTimestamp)
    };

    // Update the youth record
    const updatedYouth = await Youth.findByIdAndUpdate(
      youthId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedYouth) {
      return res.status(404).json({
        message: 'Youth record not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Youth record updated successfully',
      data: updatedYouth,
      success: true
    });
  } catch (err) {
    console.error('Error updating youth:', err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation Error',
        errors: err.errors,
        success: false
      });
    }

    res.status(500).json({
      message: 'Internal Server Error',
      success: false
    });
  }
};

// Send SMS via external API
exports.sendSms = async (req, res) => {
  const { SmsHistory } = require('../model/schema');
  const sentBy = req.user ? (req.user.email || req.user.name || 'Unknown') : 'Unknown';

  try {
    const { recipients, message } = req.body;

    if (!process.env.API_TOKEN) {
      return res.status(500).json({ success: false, message: 'API_TOKEN not configured on server' });
    }

    if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipients and message are required' });
    }

    const apiUrl = 'https://sms.iprogtech.com/api/v1/sms_messages';

    const results = [];
    const historyRecords = [];

    // Send messages sequentially to avoid rate issues; can be parallelized if needed
    for (const r of recipients) {
      const phone = r.phone || '';
      const name = r.name || '';
      const recordId = r.record_id || '';
      const recipientType = r.recipient_type || 'PWD';

      if (!phone) {
        results.push({ phone, name, status: 'skipped', reason: 'no phone' });
        // Still save to history even if skipped
        if (recordId) {
          historyRecords.push({
            recipient_type: recipientType,
            record_id: recordId,
            phone_number: phone,
            first_name: r.first_name || '',
            middle_name: r.middle_name || '',
            last_name: r.last_name || '',
            barangay: r.barangay || '',
            purok: r.purok || '',
            message: message,
            status: 'skipped',
            sent_by: sentBy
          });
        }
        continue;
      }

      const body = {
        api_token: process.env.API_TOKEN,
        phone_number: phone,
        message: message
      };

      let smsStatus = 'error';
      try {
        const resp = await axios.post(apiUrl, body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        });

        // Log full response for debugging
        console.log(`SMS API response for ${phone}: status=${resp.status}`);
        console.log('headers:', resp.headers);
        console.log('data:', resp.data);

        smsStatus = 'sent';
        results.push({ phone, name, status: 'sent', response: resp.data });
      } catch (err) {
        // Log detailed error
        if (err.response) {
          console.error(`SMS send error for ${phone}: status=${err.response.status}`, err.response.data);
        } else {
          console.error(`SMS send error for ${phone}:`, err.message);
        }
        results.push({ phone, name, status: 'error', error: err && err.response ? err.response.data : err.message });
      }

      // Save to history
      if (recordId) {
        historyRecords.push({
          recipient_type: recipientType,
          record_id: recordId,
          phone_number: phone,
          first_name: r.first_name || '',
          middle_name: r.middle_name || '',
          last_name: r.last_name || '',
          barangay: r.barangay || '',
          purok: r.purok || '',
          message: message,
          status: smsStatus,
          sent_by: sentBy
        });
      }
    }

    // Save all history records to database
    if (historyRecords.length > 0) {
      try {
        await SmsHistory.insertMany(historyRecords);
        console.log(`Saved ${historyRecords.length} SMS history records`);
      } catch (historyErr) {
        console.error('Error saving SMS history:', historyErr);
        // Don't fail the request if history save fails
      }
    }

    // If any send failed, return 503 so frontend can show service-down message
    const allSent = results.every(r => r.status === 'sent');
    if (allSent) {
      return res.status(200).json({ success: true, results });
    } else {
      return res.status(503).json({ success: false, message: 'SMS service is down at the moment', results });
    }
  } catch (err) {
    console.error('sendSms error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get SMS History
exports.getSmsHistory = async (req, res) => {
  const { SmsHistory } = require('../model/schema');
  
  try {
    const { recipient_type, limit = 100, page = 1 } = req.query;
    
    const query = {};
    if (recipient_type && (recipient_type === 'PWD' || recipient_type === 'Youth' || recipient_type === 'Senior')) {
      query.recipient_type = recipient_type;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const history = await SmsHistory.find(query)
      .sort({ sent_at: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await SmsHistory.countDocuments(query);
    
    res.json({
      success: true,
      data: history,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('getSmsHistory error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSilayBoundary = (req, res) => {
  try {
    const filePath = path.join(__dirname, "..", "files", "assets", "data", "Silay City.geojson");
    const geojson = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(geojson);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load Silay City boundary");
  }
};

exports.getVillages = (req, res) => {
  const villages = [
    { name: "Alegre", lat: 10.783000, lon: 123.054700 },
    { name: "Bagacay", lat: 10.761700, lon: 122.996600 },
    { name: "Bagtig", lat: 10.768600, lon: 123.040900 },
    { name: "Balaring", lat: 10.822500, lon: 122.960100 },
    { name: "Binonga", lat: 10.771900, lon: 122.981700 },
    { name: "Capitan Ramon", lat: 10.760200, lon: 123.114800 },
    { name: "Dalinzon", lat: 10.800000, lon: 123.100000 },
    { name: "Eustaquio Lopez", lat: 10.819500, lon: 123.041200 },
    { name: "Guimbalaon", lat: 10.755000, lon: 123.085400 },
    { name: "Guinhalaran", lat: 10.781100, lon: 122.966600 },
    { name: "Hacienda Cubay", lat: 10.788500, lon: 123.120800 },
    { name: "Hacienda Hinacayan", lat: 10.808600, lon: 123.074700 },
    { name: "Hacienda Kabungahan", lat: 10.803100, lon: 123.072200 },
    { name: "Hacienda Malisbog", lat: 10.807200, lon: 123.013900 },
    { name: "Hacienda Mansiquinon", lat: 10.746400, lon: 123.092100 },
    { name: "Hacienda Pula", lat: 10.803800, lon: 123.093600 },
    { name: "Imbang", lat: 10.796700, lon: 123.021300 },
    { name: "Kabankalan", lat: 10.819400, lon: 123.029100 },
    { name: "Lantad", lat: 10.815300, lon: 122.969900 },
    { name: "Macanig", lat: 10.781200, lon: 123.045400 },
    { name: "Macanig", lat: 10.798900, lon: 123.039800 },
    { name: "Magcorco", lat: 10.724150, lon: 123.174000 },
    { name: "Malinao", lat: 10.774300, lon: 123.105100 },
    { name: "Malisbog", lat: 10.829400, lon: 123.003200 },
    { name: "Mambulac", lat: 10.797500, lon: 122.967800 },
    { name: "Naga", lat: 10.778900, lon: 123.019600 },
    { name: "Napilas", lat: 10.768800, lon: 123.121400 },
    { name: "Navales", lat: 10.761950, lon: 123.152100 },
    { name: "Panaogao", lat: 10.792100, lon: 122.983400 },
    { name: "Quinilata", lat: 10.739800, lon: 123.111600 },
    { name: "Rizal", lat: 10.821200, lon: 122.978000 },
    { name: "San Juan", lat: 10.724300, lon: 123.135700 },
    { name: "Sangay", lat: 10.739700, lon: 123.102400 },
    { name: "Silay City", lat: 10.800300, lon: 122.976300 }
  ];

  res.json(villages);
};

// Debug endpoint to see what's in the database
exports.debugSeniorData = async (req, res) => {
  try {
    console.log('🔍 Debug: Fetching all senior data...');
    
    // Get all seniors with their barangay info
    const allSeniors = await SeniorCitizen.find({}, 'identifying_information.address.barangay identifying_information.name');
    
    // Get unique barangay names
    const uniqueBarangays = [...new Set(allSeniors.map(s => s.identifying_information.address.barangay).filter(Boolean))];
    
    // Count by barangay
    const counts = {};
    allSeniors.forEach(senior => {
      const barangay = senior.identifying_information.address.barangay;
      if (barangay) {
        counts[barangay] = (counts[barangay] || 0) + 1;
      }
    });
    
    res.json({
      success: true,
      totalSeniors: allSeniors.length,
      uniqueBarangays: uniqueBarangays,
      countsByBarangay: counts,
      sampleData: allSeniors.slice(0, 5).map(s => ({
        name: s.identifying_information.name,
        barangay: s.identifying_information.address.barangay
      }))
    });
  } catch (err) {
    console.error('❌ Debug error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get PWD count data by barangay for the map
exports.getAllPwds = async (req, res) => {
  try {
    // Get all PWD records (including archived if needed)
    const statusFilter = req.query.status === 'all' ? {} : { status: { $ne: 'Archived' } };
    const pwds = await PWD.find(statusFilter);
    
    res.json({
      success: true,
      pwds: pwds
    });
  } catch (err) {
    console.error('Error fetching PWD data:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PWD data'
    });
  }
};

exports.getPwdMapData = async (req, res) => {
  try {
    console.log('🔍 Fetching PWD data from database...');
    
    // First, let's see what barangay names are actually in the database
    const allPwds = await PWD.find({ status: { $ne: 'Archived' } }, 'barangay first_name last_name');
    console.log('🔍 All barangay names in PWD database:', allPwds.map(p => p.barangay));
    
    // Get PWD count by barangay
    const pwdCounts = await PWD.aggregate([
      {
        $match: {
          status: { $ne: 'Archived' } // Exclude archived records
        }
      },
      {
        $group: {
          _id: "$barangay",
          pwdCount: { $sum: 1 },
          maleCount: { $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } },
          femaleCount: { $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get disability counts by barangay
    const disabilityCounts = await PWD.aggregate([
      {
        $match: {
          status: { $ne: 'Archived' },
          disability: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: "$disability"
      },
      {
        $group: {
          _id: {
            barangay: "$barangay",
            disability: "$disability"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.barangay",
          disabilities: {
            $push: {
              type: "$_id.disability",
              count: "$count"
            }
          }
        }
      }
    ]);

    console.log('📊 PWD counts from database:', pwdCounts);
    console.log('📊 Disability counts from database:', disabilityCounts);

    // Define barangay coordinates and other data - Updated to match database names
    const barangayData = [
      { name: "Barangay 1", lat: 10.80240, lon: 122.97624, population: 4200 },
      { name: "Barangay 2", lat: 10.79938, lon: 122.97828, population: 3750 },
      { name: "Barangay 3", lat: 10.79770, lon: 122.97281, population: 4800 },
      { name: "Barangay 4", lat: 10.78407, lon: 123.00921, population: 3200 },
      { name: "Barangay 5", lat: 10.78147, lon: 122.99145, population: 2650 },
      { name: "Barangay Mambulac", lat: 10.79754, lon: 122.9679, population: 2100 },
      { name: "Barangay Guinhalaran", lat: 10.7811, lon: 122.9666, population: 3100 },
      { name: "Barangay E-Lopez", lat: 10.82060, lon: 123.03538, population: 1800 },
      { name: "Barangay Bagtic", lat: 10.76204, lon: 123.05122, population: 2850 },
      { name: "Barangay Balaring", lat: 10.83171, lon: 122.96136, population: 1920 },
      { name: "Barangay Hawaiian", lat: 10.82606, lon: 123.00549, population: 3900 },
      { name: "Barangay Patag", lat: 10.72466, lon: 123.15720, population: 1200 },
      { name: "Barangay Kapt. Ramon", lat: 10.77394, lon: 123.11920, population: 1500 },
      { name: "Barangay Guimbalaon", lat: 10.75730, lon: 123.07857, population: 2300 },
      { name: "Barangay Rizal", lat: 10.79816, lon: 122.99473, population: 2800 },
      { name: "Barangay Lantad", lat: 10.80845, lon: 122.97199, population: 2400 }
    ];

    // Helper function to find matching barangay data
    const findMatchingData = (barangayName, dataArray) => {
      // Try exact match first
      let match = dataArray.find(item => item._id === barangayName);
      if (match) return match;
      
      // Try case-insensitive match
      match = dataArray.find(item => 
        item._id && item._id.toLowerCase() === barangayName.toLowerCase()
      );
      if (match) return match;
      
      // Try partial match for common variations
      match = dataArray.find(item => {
        if (!item._id) return false;
        const dbName = item._id.toLowerCase();
        const mapName = barangayName.toLowerCase();
        
        // Check for common variations
        return dbName.includes(mapName) || 
               mapName.includes(dbName) ||
               dbName.includes('hawaiian') && mapName.includes('hawaiian') ||
               dbName.includes('poblacion') && mapName.includes('poblacion');
      });
      
      return match || null;
    };

    // Merge database counts with barangay data
    const result = barangayData.map(barangay => {
      // Get PWD count data
      let countData = findMatchingData(barangay.name, pwdCounts);
      let pwdCount = 0;
      let maleCount = 0;
      let femaleCount = 0;
      
      if (countData) {
        pwdCount = countData.pwdCount;
        maleCount = countData.maleCount;
        femaleCount = countData.femaleCount;
      }
      
      // Get disability data
      let disabilityData = findMatchingData(barangay.name, disabilityCounts);
      let disabilities = [];
      
      if (disabilityData && disabilityData.disabilities) {
        // Filter out disabilities with count 0 and sort by count descending
        disabilities = disabilityData.disabilities
          .filter(d => d.count > 0)
          .sort((a, b) => b.count - a.count);
      }
      
      console.log(`📍 ${barangay.name}: ${pwdCount} PWDs (${maleCount}M, ${femaleCount}F) (matched with: ${countData ? countData._id : 'none'})`);
      if (disabilities.length > 0) {
        console.log(`   Disabilities: ${disabilities.map(d => `${d.type} (${d.count})`).join(', ')}`);
      }
      
      return {
        ...barangay,
        pwdCount: pwdCount,
        maleCount: maleCount,
        femaleCount: femaleCount,
        disabilities: disabilities
      };
    });

    console.log('✅ Final PWD result with database data:', result);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('❌ Error fetching PWD map data:', err);
    res.status(500).json({ success: false, message: 'Failed to load PWD map data' });
  }
};

// Get Youth count data by barangay for the map
exports.getYouthMapData = async (req, res) => {
  try {
    console.log('🔍 Fetching Youth data from database...');
    
    // First, let's see what barangay names are actually in the database
    const allYouths = await Youth.find({}, 'barangay first_name last_name');
    console.log('🔍 All barangay names in Youth database:', allYouths.map(y => y.barangay));
    
    // Get Youth count by barangay with additional breakdowns
    const youthCounts = await Youth.aggregate([
      {
        $group: {
          _id: "$barangay",
          youthCount: { $sum: 1 },
          maleCount: { $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } },
          femaleCount: { $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } },
          skRegistered: { $sum: { $cond: [{ $eq: ["$registered_sk", "Yes"] }, 1, 0] } },
          skVoted: { $sum: { $cond: [{ $eq: ["$voted_sk", "Yes"] }, 1, 0] } },
          nationalRegistered: { $sum: { $cond: [{ $eq: ["$registered_national", "Yes"] }, 1, 0] } },
          employeeCount: { $sum: { $cond: [{ $eq: ["$employment_status", "Employee"] }, 1, 0] } },
          unemployedCount: { $sum: { $cond: [{ $eq: ["$employment_status", "Unemployed"] }, 1, 0] } },
          selfEmployedCount: { $sum: { $cond: [{ $eq: ["$employment_status", "Self-employed"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('📊 Youth counts from database:', youthCounts);

    // Define barangay coordinates and other data - Updated to match database names
    const barangayData = [
      { name: "Barangay 1", lat: 10.80240, lon: 122.97624, population: 4200 },
      { name: "Barangay 2", lat: 10.79938, lon: 122.97828, population: 3750 },
      { name: "Barangay 3", lat: 10.79770, lon: 122.97281, population: 4800 },
      { name: "Barangay 4", lat: 10.78407, lon: 123.00921, population: 3200 },
      { name: "Barangay 5", lat: 10.78147, lon: 122.99145, population: 2650 },
      { name: "Barangay Mambulac", lat: 10.79754, lon: 122.9679, population: 2100 },
      { name: "Barangay Guinhalaran", lat: 10.7811, lon: 122.9666, population: 3100 },
      { name: "Barangay E-Lopez", lat: 10.82060, lon: 123.03538, population: 1800 },
      { name: "Barangay Bagtic", lat: 10.76204, lon: 123.05122, population: 2850 },
      { name: "Barangay Balaring", lat: 10.83171, lon: 122.96136, population: 1920 },
      { name: "Barangay Hawaiian", lat: 10.82606, lon: 123.00549, population: 3900 },
      { name: "Barangay Patag", lat: 10.72466, lon: 123.15720, population: 1200 },
      { name: "Barangay Kapt. Ramon", lat: 10.77394, lon: 123.11920, population: 1500 },
      { name: "Barangay Guimbalaon", lat: 10.75730, lon: 123.07857, population: 2300 },
      { name: "Barangay Rizal", lat: 10.79816, lon: 122.99473, population: 2800 },
      { name: "Barangay Lantad", lat: 10.80845, lon: 122.97199, population: 2400 }
    ];

    // Merge database counts with barangay data
    const result = barangayData.map(barangay => {
      // Try exact match first
      let countData = youthCounts.find(item => item._id === barangay.name);
      let youthCount = 0;
      let maleCount = 0;
      let femaleCount = 0;
      let skRegistered = 0;
      let skVoted = 0;
      let nationalRegistered = 0;
      let employeeCount = 0;
      let unemployedCount = 0;
      let selfEmployedCount = 0;
      
      if (countData) {
        youthCount = countData.youthCount;
        maleCount = countData.maleCount;
        femaleCount = countData.femaleCount;
        skRegistered = countData.skRegistered;
        skVoted = countData.skVoted;
        nationalRegistered = countData.nationalRegistered;
        employeeCount = countData.employeeCount || 0;
        unemployedCount = countData.unemployedCount || 0;
        selfEmployedCount = countData.selfEmployedCount || 0;
      } else {
        // Try case-insensitive match
        countData = youthCounts.find(item => 
          item._id && item._id.toLowerCase() === barangay.name.toLowerCase()
        );
        if (countData) {
          youthCount = countData.youthCount;
          maleCount = countData.maleCount;
          femaleCount = countData.femaleCount;
          skRegistered = countData.skRegistered;
          skVoted = countData.skVoted;
          nationalRegistered = countData.nationalRegistered;
          employeeCount = countData.employeeCount || 0;
          unemployedCount = countData.unemployedCount || 0;
          selfEmployedCount = countData.selfEmployedCount || 0;
        } else {
          // Try partial match for common variations
          countData = youthCounts.find(item => {
            if (!item._id) return false;
            const dbName = item._id.toLowerCase();
            const mapName = barangay.name.toLowerCase();
            
            // Check for common variations
            return dbName.includes(mapName) || 
                   mapName.includes(dbName) ||
                   dbName.includes('hawaiian') && mapName.includes('hawaiian') ||
                   dbName.includes('poblacion') && mapName.includes('poblacion');
          });
          if (countData) {
            youthCount = countData.youthCount;
            maleCount = countData.maleCount;
            femaleCount = countData.femaleCount;
            skRegistered = countData.skRegistered;
            skVoted = countData.skVoted;
            nationalRegistered = countData.nationalRegistered;
            employeeCount = countData.employeeCount || 0;
            unemployedCount = countData.unemployedCount || 0;
            selfEmployedCount = countData.selfEmployedCount || 0;
          }
        }
      }
      
      console.log(`📍 ${barangay.name}: ${youthCount} Youths (${maleCount}M, ${femaleCount}F) (SK: ${skRegistered} registered, ${skVoted} voted) (matched with: ${countData ? countData._id : 'none'})`);
      
      return {
        ...barangay,
        youthCount: youthCount,
        maleCount: maleCount,
        femaleCount: femaleCount,
        skRegistered: skRegistered,
        skVoted: skVoted,
        nationalRegistered: nationalRegistered,
        employeeCount: employeeCount,
        unemployedCount: unemployedCount,
        selfEmployedCount: selfEmployedCount
      };
    });

    console.log('✅ Final Youth result with database data:', result);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('❌ Error fetching Youth map data:', err);
    res.status(500).json({ success: false, message: 'Failed to load Youth map data' });
  }
};

// Get Youth count per barangay for admin analytics
exports.getYouthAnalytics = async (req, res) => {
  try {
    console.log('🔍 Fetching Youth analytics data from database...');
    
    // Get Youth count by barangay
    const youthCounts = await Youth.aggregate([
      {
        $group: {
          _id: "$barangay",
          lydoCount: { $sum: 1 },
          maleCount: { $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } },
          femaleCount: { $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } },
          skRegistered: { $sum: { $cond: [{ $eq: ["$registered_sk", "Yes"] }, 1, 0] } },
          skVoted: { $sum: { $cond: [{ $eq: ["$voted_sk", "Yes"] }, 1, 0] } },
          nationalRegistered: { $sum: { $cond: [{ $eq: ["$registered_national", "Yes"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('📊 Youth counts from database:', youthCounts);

    // Define all barangays in Silay City (matching the map data)
    const allBarangays = [
      "Barangay 1", "Barangay 2", "Barangay 3", "Barangay 4", "Barangay 5",
      "Barangay Mambulac", "Barangay Guinhalaran", "Barangay E-Lopez", "Barangay Bagtic",
      "Barangay Balaring", "Barangay Hawaiian", "Barangay Patag",
      "Barangay Kapt. Ramon", "Barangay Guimbalaon", "Barangay Rizal", "Barangay Lantad"
    ];

    // Create result array with all barangays, including those with 0 count
    const result = allBarangays.map((barangayName, index) => {
      const countData = youthCounts.find(item => 
        item._id && item._id.toLowerCase() === barangayName.toLowerCase()
      );
      
      return {
        id: index + 1,
        name: barangayName,
        lydoCount: countData ? countData.lydoCount : 0,
        maleCount: countData ? countData.maleCount : 0,
        femaleCount: countData ? countData.femaleCount : 0,
        skRegistered: countData ? countData.skRegistered : 0,
        skVoted: countData ? countData.skVoted : 0,
        nationalRegistered: countData ? countData.nationalRegistered : 0
      };
    });

    // Calculate totals
    const totalLYDO = result.reduce((sum, item) => sum + item.lydoCount, 0);
    const totalBarangays = result.length;
    const averageLYDO = totalBarangays > 0 ? Math.round(totalLYDO / totalBarangays) : 0;

    console.log('✅ Youth analytics data prepared:', { totalLYDO, totalBarangays, averageLYDO });

    res.json({ 
      success: true, 
      data: {
        barangays: result,
        totalLYDO,
        totalBarangays,
        averageLYDO
      }
    });
  } catch (err) {
    console.error('❌ Error fetching Youth analytics data:', err);
    res.status(500).json({ success: false, message: 'Failed to load Youth analytics data' });
  }
};

// Get senior count data by barangay for the map
exports.getSeniorMapData = async (req, res) => {
  try {
    console.log('🔍 Fetching senior data from database...');
    
    // First, let's see what barangay names are actually in the database
    const allSeniors = await SeniorCitizen.find({ status: { $ne: 'Archived' } }, 'identifying_information.address.barangay');
    console.log('🔍 All barangay names in database:', allSeniors.map(s => s.identifying_information.address.barangay));
    
    // Get senior count by barangay with gender breakdown
    const seniorCounts = await SeniorCitizen.aggregate([
      {
        $match: {
          status: { $ne: 'Archived' } // Exclude archived records
        }
      },
      {
        $group: {
          _id: "$identifying_information.address.barangay",
          seniorCount: { $sum: 1 },
          maleCount: { $sum: { $cond: [{ $eq: ["$identifying_information.gender", "Male"] }, 1, 0] } },
          femaleCount: { $sum: { $cond: [{ $eq: ["$identifying_information.gender", "Female"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('📊 Senior counts from database:', seniorCounts);

    // Define barangay coordinates and other data - Updated to match database names
    const barangayData = [
      { name: "Barangay 1", lat: 10.80240, lon: 122.97624, population: 4200 },
      { name: "Barangay 2", lat: 10.79938, lon: 122.97828, population: 3750 },
      { name: "Barangay 3", lat: 10.79770, lon: 122.97281, population: 4800 },
      { name: "Barangay 4", lat: 10.78407, lon: 123.00921, population: 3200 },
      { name: "Barangay 5", lat: 10.78147, lon: 122.99145, population: 2650 },
      { name: "Barangay Mambulac", lat: 10.79754, lon: 122.9679, population: 2100 },
      { name: "Barangay Guinhalaran", lat: 10.7811, lon: 122.9666, population: 3100 },
      { name: "Barangay E-Lopez", lat: 10.82060, lon: 123.03538, population: 1800 },
      { name: "Barangay Bagtic", lat: 10.76204, lon: 123.05122, population: 2850 },
      { name: "Barangay Balaring", lat: 10.83171, lon: 122.96136, population: 1920 },
      { name: "Barangay Hawaiian", lat: 10.82606, lon: 123.00549, population: 3900 },
      { name: "Barangay Patag", lat: 10.72466, lon: 123.15720, population: 1200 },
      { name: "Barangay Kapt. Ramon", lat: 10.77394, lon: 123.11920, population: 1500 },
      { name: "Barangay Guimbalaon", lat: 10.75730, lon: 123.07857, population: 2300 },
      { name: "Barangay Rizal", lat: 10.79816, lon: 122.99473, population: 2800 },
      { name: "Barangay Lantad", lat: 10.80845, lon: 122.97199, population: 2400 }
    ];

    // Merge database counts with barangay data
    const result = barangayData.map(barangay => {
      // Try exact match first
      let countData = seniorCounts.find(item => item._id === barangay.name);
      let seniorCount = 0;
      let maleCount = 0;
      let femaleCount = 0;
      
      if (countData) {
        seniorCount = countData.seniorCount;
        maleCount = countData.maleCount || 0;
        femaleCount = countData.femaleCount || 0;
      } else {
        // Try case-insensitive match
        countData = seniorCounts.find(item => 
          item._id && item._id.toLowerCase() === barangay.name.toLowerCase()
        );
        if (countData) {
          seniorCount = countData.seniorCount;
          maleCount = countData.maleCount || 0;
          femaleCount = countData.femaleCount || 0;
        } else {
          // Try partial match for common variations
          countData = seniorCounts.find(item => {
            if (!item._id) return false;
            const dbName = item._id.toLowerCase();
            const mapName = barangay.name.toLowerCase();
            
            // Check for common variations
            return dbName.includes(mapName) || 
                   mapName.includes(dbName) ||
                   dbName.includes('hawaiian') && mapName.includes('hawaiian') ||
                   dbName.includes('poblacion') && mapName.includes('poblacion');
          });
          if (countData) {
            seniorCount = countData.seniorCount;
            maleCount = countData.maleCount || 0;
            femaleCount = countData.femaleCount || 0;
          }
        }
      }
      
      console.log(`📍 ${barangay.name}: ${seniorCount} seniors (matched with: ${countData ? countData._id : 'none'})`);
      
      return {
        ...barangay,
        seniorCount: seniorCount,
        maleCount: maleCount,
        femaleCount: femaleCount
      };
    });

    console.log('✅ Final result with database data:', result);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('❌ Error fetching senior map data:', err);
    res.status(500).json({ success: false, message: 'Failed to load senior map data' });
  }
};


exports.editUserStatus = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'User id is required' });
    }

    const existing = await User.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const nextStatus = existing.status === 'Inactive' ? 'Active' : 'Inactive';
    await User.findByIdAndUpdate(id, { status: nextStatus }, { new: true });
    return res.redirect('/superadmin-users');
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id, name, email, role, status, password, confirm_password } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'User id is required' });
    }

    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (role) update.role = role;
    if (status) update.status = status;

    if (password || confirm_password) {
      if (!password || !confirm_password) {
        return res.status(400).json({ message: 'Both password and confirm_password are required' });
      }
      if (password !== confirm_password) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      const hashedPassword = await bcrypt.hash(password, saltrounds);
      update.password = hashedPassword;
    }

    if (Object.keys(update).length === 0) {
      return res.redirect('/superadmin-users');
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(id, update, { new: true });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.redirect('/superadmin-users');
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Render superadmin page with barangays data
exports.renderSuperAdmin = async (req, res) => {
  try {
    const barangayList = await Barangay.find({});
    const barangays = {};
    barangayList.forEach(({ barangay, puroks }) => {
      barangays[barangay] = puroks || [];
    });

    res.render('superadmin/admin_super_admin', {
      barangays: barangays || {},
      barangayList: barangayList || []
    });
  } catch (err) {
    console.error('Error fetching barangays:', err);
    res.status(500).send('Internal Server Error');
  }
};

// API: Get all barangays
exports.getBarangays = async (req, res) => {
  try {
    const barangayList = await Barangay.find({});
    const barangays = {};
    barangayList.forEach(({ barangay, puroks }) => {
      barangays[barangay] = puroks || [];
    });

    res.json({
      success: true,
      barangays: barangays,
      barangayList: barangayList
    });
  } catch (err) {
    console.error('Error fetching barangays:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// API: Create new barangay
exports.createBarangay = async (req, res) => {
  try {
    const { barangayName } = req.body;

    if (!barangayName || !barangayName.trim()) {
      return res.status(400).json({ success: false, message: 'Barangay name is required' });
    }

    // Check if barangay already exists
    const existingBarangay = await Barangay.findOne({ barangay: barangayName.trim() });
    if (existingBarangay) {
      return res.status(400).json({ success: false, message: 'Barangay already exists' });
    }

    // Create new barangay
    const newBarangay = new Barangay({
      barangay: barangayName.trim(),
      puroks: []
    });

    await newBarangay.save();

    res.json({
      success: true,
      message: 'Barangay created successfully',
      barangay: newBarangay
    });
  } catch (err) {
    console.error('Error creating barangay:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// API: Add purok to barangay
exports.addPurok = async (req, res) => {
  try {
    const { barangayId, purokName } = req.body;

    if (!barangayId || !purokName || !purokName.trim()) {
      return res.status(400).json({ success: false, message: 'Barangay and purok name are required' });
    }

    // Find the barangay
    const barangay = await Barangay.findById(barangayId);
    if (!barangay) {
      return res.status(404).json({ success: false, message: 'Barangay not found' });
    }

    // Check if purok already exists
    if (barangay.puroks.includes(purokName.trim())) {
      return res.status(400).json({ success: false, message: 'Purok already exists in this barangay' });
    }

    // Add purok to the barangay
    barangay.puroks.push(purokName.trim());
    await barangay.save();

    res.json({
      success: true,
      message: 'Purok added successfully',
      barangay: barangay
    });
  } catch (err) {
    console.error('Error adding purok:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



